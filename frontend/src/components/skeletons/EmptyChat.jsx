import { useState } from "react";
import { MessageSquare, RefreshCw, Grab, Hand, Scissors } from "lucide-react";

const choices = ["rock", "paper", "scissors"];
const icons = {
  rock: <Grab size={32} className="text-gray-700" />,
  paper: <Hand size={32} className="text-gray-700" />,
  scissors: <Scissors size={32} className="text-gray-700" />,
};

const getResult = (userChoice, aiChoice) => {
  if (userChoice === aiChoice) return "It's a draw! 😐";
  if (
    (userChoice === "rock" && aiChoice === "scissors") ||
    (userChoice === "paper" && aiChoice === "rock") ||
    (userChoice === "scissors" && aiChoice === "paper")
  ) {
    return "You win! 🎉";
  }
  return "You lose! 😭";
};

const EmptyChat = () => {
  const [userChoice, setUserChoice] = useState(null);
  const [aiChoice, setAiChoice] = useState(null);
  const [result, setResult] = useState("");

  const playGame = (choice) => {
    const randomAiChoice = choices[Math.floor(Math.random() * choices.length)];
    setUserChoice(choice);
    setAiChoice(randomAiChoice);
    setResult(getResult(choice, randomAiChoice));
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <MessageSquare size={64} className="text-gray-400 animate-bounce" />
      <p className="text-gray-500 mt-4 text-lg font-medium">No messages yet? Play a quick game!</p>
      <p className="text-gray-400 text-sm">Rock-Paper-Scissors for fun 🎮</p>

      {userChoice ? (
        <div className="mt-6 p-4 border rounded-lg shadow-md bg-gray-100">
          <p className="font-medium text-lg">You chose:</p>
          <div className="mt-2">{icons[userChoice]}</div>

          <p className="mt-4 font-medium text-lg">AI chose:</p>
          <div className="mt-2">{icons[aiChoice]}</div>

          <p className="mt-4 text-xl font-bold">{result}</p>

          <button
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
            onClick={() => {
              setUserChoice(null);
              setAiChoice(null);
              setResult("");
            }}
          >
            <RefreshCw size={18} />
            Play Again
          </button>
        </div>
      ) : (
        <div className="mt-6 flex gap-4">
          {choices.map((choice) => (
            <button
              key={choice}
              className="bg-gray-200 hover:bg-gray-300 p-3 rounded-lg transition shadow-md flex flex-col items-center"
              onClick={() => playGame(choice)}
            >
              {icons[choice]}
              <span className="capitalize mt-1 font-medium">{choice}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmptyChat;
