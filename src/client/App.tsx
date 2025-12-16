import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>MyDBDiagram.io</h1>
        <p>Database Diagram Tool</p>
      </header>
      <main className="app-main">
        <div className="welcome">
          <p>Welcome to MyDBDiagram.io</p>
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;

