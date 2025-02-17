"use client";
import { useState, useEffect } from "react";

const GRID_SIZE = 20;
const STATES = ["off", "young", "adult", "elder"];
const COLORS = { off: "#444", young: "#facc15", adult: "#22c55e", elder: "#3b82f6" };

function distributeValues(values: number[], desiredSum: number): number[] {
  const integerParts = values.map(v => Math.floor(v));
  const fractions = values.map((v, i) => ({ index: i, fraction: v - integerParts[i] }));
  const currentSum = integerParts.reduce((a, b) => a + b, 0);
  const remainder = desiredSum - currentSum;

  if (remainder < 0) {
    return integerParts;
  }

  fractions.sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; i < remainder; i++) {
    if (i >= fractions.length) break;
    integerParts[fractions[i].index]++;
  }

  return integerParts;
}

export default function Home() {
  const [grid, setGrid] = useState<string[][]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [percentages, setPercentages] = useState({
    off: 25,
    young: 25,
    adult: 25,
    elder: 25,
  });

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setGrid(prev => prev.map((row, i) =>
          row.map((cellState, j) => {
            let youngNeighbors = 0;
            let adultNeighbors = 0;
            let elderNeighbors = 0;

            // Calcul des voisins
            for (let di = -1; di <= 1; di++) {
              for (let dj = -1; dj <= 1; dj++) {
                if (di === 0 && dj === 0) continue;
                const ni = i + di;
                const nj = j + dj;
                if (ni >= 0 && ni < GRID_SIZE && nj >= 0 && nj < GRID_SIZE) {
                  const neighborState = prev[ni][nj];
                  if (neighborState === "young") youngNeighbors++;
                  if (neighborState === "adult") adultNeighbors++;
                  if (neighborState === "elder") elderNeighbors++;
                }
              }
            }

            // Mise en place d'un système de vie / reproduction, vieillissement, proie / prédateur
            switch(cellState) {
              case "young":
                // Les adultes mangent les jeunes s'ils sont trop nombreux
                return adultNeighbors > 1 ? "off" : "adult";

              case "adult":
                // Reproduction si assez de jeunes, sinon vieillissement
                return youngNeighbors >= 2 ? "young" : "elder";

              case "elder":
                // Surpopulation d'anciens entraîne leur disparition
                return elderNeighbors > 3 ? "off" : "young";

              case "off":
                // Régénération si équilibre prédateur/proie
                return (adultNeighbors + youngNeighbors) === 2 ? "young" : "off";

              default:
                return "off";
            }
          })
      ));
    }, 2000 - speed);

    return () => clearInterval(interval);
  }, [isRunning, speed]);

  const toggleCell = (row: number, col: number) => {
    if (!isRunning) {
      setGrid(prev => prev.map((r, rIndex) => 
        rIndex === row ? r.map((c, cIndex) => 
          cIndex === col ? STATES[(STATES.indexOf(c) + 1) % STATES.length] : c) : [...r]
      ));
    }
  };

  const clearGrid = () => {
    setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill("off")));
    setIsRunning(false);
  };

  const randomizeGrid = () => {
    const newGrid = Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill(null).map(() => {
        let total = 0;
        for (const state of STATES) total += percentages[state as keyof typeof percentages];
        if (total === 0) return "off";
        
        const random = Math.random() * total;
        let sum = 0;
        for (const state of STATES) {
          sum += percentages[state as keyof typeof percentages];
          if (random < sum) return state;
        }
        return "off";
      })
    );
    setGrid(newGrid);
  };

  const handlePercentageChange = (state: keyof typeof percentages, value: number) => {
    setPercentages(prev => {
      const newValue = Math.max(0, Math.min(100, value));
      const otherStates = (Object.keys(prev) as (keyof typeof prev)[]).filter(key => key !== state);
      const originalOtherSum = otherStates.reduce((sum, key) => sum + prev[key], 0);
      const newRemaining = 100 - newValue;

      const newPercentages: typeof percentages = { ...prev, [state]: newValue };

      if (otherStates.length === 0) {
        return newPercentages;
      }

      if (originalOtherSum === 0) {
        const each = Math.floor(newRemaining / otherStates.length);
        const remainder = newRemaining % otherStates.length;
        otherStates.forEach((key, index) => {
          newPercentages[key] = each + (index < remainder ? 1 : 0);
        });
      } else {
        const shares = otherStates.map(key => {
          const current = prev[key];
          return (current / originalOtherSum) * newRemaining;
        });

        const integerShares = distributeValues(shares, newRemaining);

        otherStates.forEach((key, index) => {
          newPercentages[key] = integerShares[index];
        });
      }

      const total = otherStates.reduce((sum, key) => sum + newPercentages[key], newValue);
      if (total !== 100) {
        const diff = 100 - total;
        const firstOther = otherStates[0];
        newPercentages[firstOther] += diff;
        if (newPercentages[firstOther] < 0) {
          newPercentages[firstOther] = 0;
        }
      }

      return newPercentages;
    });
  };

  return (
    <div className="min-h-screen p-8 flex flex-col items-center bg-gray-900 text-white">
      <div className="mb-4 flex gap-4 items-center">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="px-6 py-2 rounded-lg transition-colors duration-200"
          style={{ backgroundColor: isRunning ? '#ef4444' : '#22c55e' }}
        >
          {isRunning ? 'Stop' : 'Start'}
        </button>

        <button
          onClick={clearGrid}
          className="px-6 py-2 bg-blue-500 rounded-lg transition-colors duration-200"
        >
          Clear
        </button>

        <div className="flex items-center gap-4">
          <input
            type="range"
            min="100"
            max="1900"
            step="100"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-40 cursor-pointer"
          />
          <span>{2000 - speed}ms</span>
        </div>
      </div>

      <div className="flex gap-8 w-full justify-center">
        <div className="flex flex-col gap-4 p-4 bg-gray-800 rounded-lg w-64">
          <button
            onClick={randomizeGrid}
            className="px-6 py-2 bg-yellow-500 rounded-lg transition-colors duration-200"
          >
            Randomize
          </button>

          {STATES.map((state) => (
            <div key={state} className="flex flex-col gap-2">
              <label className="capitalize text-sm">{state}</label>
              <input
                type="range"
                min="0"
                max="100"
                value={percentages[state as keyof typeof percentages]}
                onChange={(e) => handlePercentageChange(state as keyof typeof percentages, parseInt(e.target.value))}
                className="cursor-pointer"
              />
              <span className="text-xs text-gray-300">{percentages[state as keyof typeof percentages]}%</span>
            </div>
          ))}
        </div>

        <div className="overflow-auto max-h-[80vh]">
          <div 
            className="grid gap-1 p-2 bg-gray-800 rounded-lg shadow-lg"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
          >
            {grid.map((row, rowIndex) => 
              row.map((cellState, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`h-4 w-4 rounded-sm transition-colors duration-200 ${
                    !isRunning ? 'cursor-pointer hover:brightness-125' : ''
                  }`}
                  style={{ backgroundColor: COLORS[cellState] }}
                  onClick={() => toggleCell(rowIndex, colIndex)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}