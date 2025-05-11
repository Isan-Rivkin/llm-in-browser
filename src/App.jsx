import { useState, useEffect } from 'react'
import './App.css'
import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

// function (aka tools) calling can be done but still WIP 
// https://github.com/mlc-ai/web-llm/tree/main/examples/function-calling
function App() {
  const model = "Hermes-3-Llama-3.1-8B-q4f16_1-MLC";
  const [count, setCount] = useState(0)
  // Initialize with a progress callback
  const [engine, setEngine] = useState(null);
  const [progressLoad, setProgressLoad] = useState('');

  // chat state https://webllm.mlc.ai/docs/user/basic_usage.html#streaming-chat-completion
  const [messages, setMessages] = useState([
    { role: "system", content: "You are a helpful AI assistant." },
    { role: "user", content: "Hello!" },
  ]);
  const [modelReply, setModelReply] = useState("");
  const [modelUsage, setModelUsage] = useState(""); // not sure what usage is
  const initProgressCallback = (progress) => {
    console.log("Model loading progress:", progress);
    setProgressLoad(progress.text);
  };
  const onCreateCompletion = async (engine, messages) => {
    if (!engine) {
      console.error("Engine is not initialized.");
      return;
    }

    // Validate the messages array
    if (!Array.isArray(messages) || messages.some(msg => !msg.role || typeof msg.content !== "string")) {
      console.error("Invalid messages array:", messages);
      return;
    }

    console.log("Messages passed to onCreateCompletion:", messages);

    try {
      const userMessage = messages[messages.length - 1].content; // Get the last user message
      setModelReply((prev) => `${prev}\n> Human:\n${userMessage}\n> Bot:\n`); // Append the user's message

      const chunks = await engine.chat.completions.create({
        messages,
        temperature: 1,
        stream: true, // Enable streaming
        stream_options: { include_usage: true },
      });

      for await (const chunk of chunks) {
        let chunkReply = chunk.choices[0]?.delta.content || "";
        setModelReply((prev) => prev + chunkReply); // Append the AI's reply in streaming mode
        console.log(chunkReply);
        if (chunk.usage) {
          console.log("USAGE: ", chunk.usage); // Only the last chunk has usage
        }
      }
      const finalMessage = await engine.getMessage();
      console.log("Final message:", finalMessage);
    } catch (error) {
      console.error("Error in onCreateCompletion:", error);
    }
  };
  // add useEffect to load the model 
  useEffect(() => {
    const loadModel = async () => {
      try {
        const engine2 = await CreateMLCEngine(model, { initProgressCallback });
        setEngine(engine2);
        console.log("Model loaded successfully");
      } catch (error) {
        console.error("Error loading model:", error);
      }
    };
    loadModel();
  }
    , []);

  return (
    <>
      <h1>Web-LLM in the <a href="https://webllm.mlc.ai/docs/user/basic_usage.html">browser</a></h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Current model <code>{model}</code> see <a href="https://github.com/mlc-ai/web-llm/blob/main/src/config.ts#L293">available models</a>
        </p>
      </div>
      <p className="read-the-docs">
        {engine ? <span style={{ color: 'green' }}>Model loaded successfully ✅</span> : <span>🔄⏳ Loading model... {progressLoad}</span>}
      </p>

      {/* Chat Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const userMessage = e.target.elements.userMessage.value;
          if (userMessage.trim()) {
            const updatedMessages = [...messages, { role: "user", content: userMessage }];
            setMessages(updatedMessages); // Update the state with the new message
            if (engine) {
              onCreateCompletion(engine, updatedMessages); // Pass the updated messages array
            } else {
              console.error("Engine is not initialized.");
            }
            e.target.reset();
          }
        }}
      >
        <input
          type="text"
          name="userMessage"
          placeholder="Type your message here..."
          style={{ width: '80%', padding: '10px', marginRight: '10px' }}
        />
        <button type="submit" style={{ padding: '10px' }}>Send</button>
      </form>

      {/* Chat Response */}
      <textarea
        readOnly
        value={modelReply}
        style={{
          width: '100%',
          height: '200px',
          marginTop: '20px',
          padding: '10px',
          fontSize: '16px',
        }}
      />
    </>
  )
}

export default App
