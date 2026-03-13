import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

const WINDOW_COUNT = 12;
const WORD_COUNT = 2048;
const ROW_HEIGHT = 40;

export default function SlotWordCloud() {

  const [words, setWords] = useState([]);
  const [selected, setSelected] = useState([]);

  const columnRefs = useRef([]);
  const tweenRefs = useRef([]);

  useEffect(() => {

    fetch("/english.txt")
      .then(r => r.text())
      .then(text => {

        const list = text
          .split("\n")
          .map(v => v.trim())
          .filter(Boolean);

        setWords(list);

      });

  }, []);



  useEffect(() => {

    if (!words.length) return;

    columnRefs.current.forEach((col, i) => {

      const dir = i % 2 === 0 ? 1 : -1;
      const total = WORD_COUNT * ROW_HEIGHT;

      const tween = gsap.fromTo(
        col,
        { y: dir === 1 ? 0 : -total },
        {
          y: dir === 1 ? -total : 0,
          duration: 200,
          ease: "linear",
          repeat: -1
        }
      );

      tweenRefs.current[i] = tween;

    });

  }, [words]);

  const sendToBackend = () => {
    const selectedWords = Object.entries(selectedIndices).map(
      ([colIndex, wordIndex]) => {
        const colWords = columnRefs.current[colIndex].children;
        return colWords[wordIndex].innerText;
      }
    );
  
    fetch("http://localhost:5000/api/result", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        words: selectedWords
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log("recv:", data);
        alert("recv: " + JSON.stringify(data));
      })
      .catch(err => console.error("err:", err));
  };

  const [selectedIndices, setSelectedIndices] = useState({});

  const selectWord = (colIndex) => {
    const col = columnRefs.current[colIndex];
    if (!col) return;

    const parent = col.parentNode;
    const center = parent.getBoundingClientRect().top + parent.offsetHeight / 2;

    const children = [...col.children];
    let found = null;
    let foundIndex = 0;

    children.forEach((el, idx) => {
      const r = el.getBoundingClientRect();
      if (r.top <= center && r.bottom >= center) {
        found = el;
        foundIndex = idx;
      }
    });

    if (!found) return;

    tweenRefs.current[colIndex].pause();

    const offset = center - (found.getBoundingClientRect().top + ROW_HEIGHT / 2);

    gsap.to(col, {
      y: `+=${offset}`,
      duration: 0.3
    });

    setSelectedIndices((prev) => ({
      ...prev,
      [colIndex]: foundIndex
    }));
  };

  const resetSelection = () => {
    setSelectedIndices({});

    columnRefs.current.forEach((col, i) => {
      if (tweenRefs.current[i]) {
        tweenRefs.current[i].kill();
      }

      const dir = i % 2 === 0 ? 1 : -1;
      const total = WORD_COUNT * ROW_HEIGHT;

      const tween = gsap.fromTo(
        col,
        { y: dir === 1 ? 0 : -total },
        {
          y: dir === 1 ? -total : 0,
          duration: 200,
          ease: "linear",
          repeat: -1
        }
      );

      tweenRefs.current[i] = tween;
    });
  };



  return (

    <div className="wrapper">

      <div className="windows">

        {Array.from({ length: WINDOW_COUNT }).map((_, i) => {

          const list = [];

          for (let j = 0; j < WORD_COUNT; j++) {
            list.push(words[j % words.length]);
          }

          return (

            <div key={i} className="column-wrapper">

              <div className="column">

                <div className="selector" />

                <div
                  className="word-column"
                  ref={el => columnRefs.current[i] = el}
                >

                  {list.map((w, k) => {
                    const isSelected = selectedIndices[i] === k;
                    return (
                      <div
                        key={k}
                        className="word"
                        style={{
                          height: ROW_HEIGHT,
                          color: `hsl(${Math.random() * 360},70%,55%)`,
                          fontSize: isSelected ? 28 : 18,
                          fontWeight: isSelected ? "bold" : 500
                        }}
                      >
                        {w}
                      </div>
                    );
                  })}

                </div>

              </div>

              <button
                className="select-btn"
                onClick={() => selectWord(i)}
              >
                PICK!
              </button>

            </div>

          );

        })}

      </div>

      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        <button className="refresh-btn" onClick={resetSelection}>Refresh</button>
        <button className="submit-btn" onClick={sendToBackend}>Go!</button>
      </div>

    </div>

  );

}