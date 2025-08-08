/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useRef, useCallback, type FC, type DragEvent } from "react";

type SnapSide = "left" | "right" | "top" | "bottom";

interface WindowData {
  id: number;
  color: string;
  top: number;
  left: number;
  width: number;
  height: number;
  isSnapped: boolean;
  parent: number | null;
}

interface WindowProps {
  windowData: WindowData;
  onClose: (id: number) => void;
  onDragStart: (e: DragEvent, id: number) => void;
  onDrag: (e: DragEvent, id: number) => void;
  onDrop: (e: DragEvent, targetId: number) => void;
}

interface SnapIndicatorState {
  show: boolean;
  side: SnapSide | null;
  target?: number;
  top: number | string;
  left: number | string;
  width: number | string;
  height: number | string;
}

interface Position {
  x: number;
  y: number;
}

const SNAP_THRESHOLD = 30;
const EMPTY_INDICATOR: SnapIndicatorState = {
  show: false,
  side: null,
  top: 0,
  left: 0,
  width: 0,
  height: 0,
};

const Window: FC<WindowProps> = ({
  windowData,
  onClose,
  onDragStart,
  onDrag,
  onDrop,
}) => {
  const { id, color, top, left, width, height } = windowData;

  return (
    <div
      className="window"
      style={{
        backgroundColor: color,
        top,
        left,
        width,
        height,
        position: "absolute",
        borderRadius: "8px",
        overflow: "hidden",
        transition:
          "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
        boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.stopPropagation();
        onDrop(e, id);
      }}
    >
      <div
        className="title-bar"
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData("text/plain", id.toString());
          onDragStart(e, id);
        }}
        onDrag={(e) => {
          e.stopPropagation();
          onDrag(e, id);
        }}
        style={{
          background: "rgba(0,0,0,0.2)",
          padding: "6px",
          cursor: "grab",
          color: "#fff",
          fontWeight: "bold",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Window {id}</span>
        <button
          className="close-button"
          onClick={() => onClose(id)}
          style={{
            background: "rgba(255,255,255,0.3)",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            padding: "2px 6px",
            color: "#fff",
          }}
        >
          ✕
        </button>
      </div>
      <div
        className="content"
        style={{ flex: 1, background: "rgba(255,255,255,0.6)" }}
      ></div>
    </div>
  );
};

const App: FC = () => {
  const [windows, setWindows] = useState<WindowData[]>([]);
  const [snapIndicator, setSnapIndicator] =
    useState<SnapIndicatorState>(EMPTY_INDICATOR);
  const draggedWindowId = useRef<number | null>(null);
  const dragStartPos = useRef<Position | null>(null);

  const createWindow = useCallback(() => {
    setWindows((prev) => [
      ...prev,
      {
        id: Date.now(),
        color: `rgb(${Math.floor(Math.random() * 255)},${Math.floor(
          Math.random() * 255
        )},${Math.floor(Math.random() * 255)})`,
        top: Math.random() * (window.innerHeight - 200),
        left: Math.random() * (window.innerWidth - 200),
        width: 300,
        height: 200,
        isSnapped: false,
        parent: null,
      },
    ]);
  }, []);

  const unsnapWindow = useCallback((windowId: number) => {
    setWindows((curr) => {
      const win = curr.find((w) => w.id === windowId);
      if (!win?.isSnapped || !win.parent) return curr;

      const sibling = curr.find((w) => w.id === win.parent);
      if (!sibling) {
        return curr.map((w) =>
          w.id === windowId ? { ...w, isSnapped: false, parent: null } : w
        );
      }

      const updatedSibling = {
        ...sibling,
        width: sibling.width + win.width,
        height: sibling.height + win.height,
        isSnapped: false,
        parent: null,
      };

      return curr.map((w) =>
        w.id === sibling.id
          ? updatedSibling
          : w.id === windowId
          ? { ...w, isSnapped: false, parent: null }
          : w
      );
    });
  }, []);

  const closeWindow = useCallback(
    (id: number) => {
      unsnapWindow(id);
      setWindows((prev) => prev.filter((w) => w.id !== id));
    },
    [unsnapWindow]
  );

  const handleDragStart = useCallback(
    (e: DragEvent, id: number) => {
      draggedWindowId.current = id;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      unsnapWindow(id);
    },
    [unsnapWindow]
  );

  const handleDrag = useCallback(
    (e: DragEvent, id: number) => {
      if (
        draggedWindowId.current !== id ||
        !dragStartPos.current ||
        e.clientX === 0
      )
        return;

      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      dragStartPos.current = { x: e.clientX, y: e.clientY };

      setWindows((curr) =>
        curr.map((w) =>
          w.id === id ? { ...w, left: w.left + dx, top: w.top + dy } : w
        )
      );

      const { clientX, clientY } = e;
      let indicator = EMPTY_INDICATOR;

      for (const w of windows) {
        if (w.id === id) continue;
        const inside =
          clientX > w.left &&
          clientX < w.left + w.width &&
          clientY > w.top &&
          clientY < w.top + w.height;
        if (!inside) continue;

        if (clientX < w.left + SNAP_THRESHOLD) {
          indicator = {
            show: true,
            side: "left",
            target: w.id,
            top: w.top,
            left: w.left,
            width: w.width / 2,
            height: w.height,
          };
        } else if (clientX > w.left + w.width - SNAP_THRESHOLD) {
          indicator = {
            show: true,
            side: "right",
            target: w.id,
            top: w.top,
            left: w.left + w.width / 2,
            width: w.width / 2,
            height: w.height,
          };
        } else if (clientY < w.top + SNAP_THRESHOLD) {
          indicator = {
            show: true,
            side: "top",
            target: w.id,
            top: w.top,
            left: w.left,
            width: w.width,
            height: w.height / 2,
          };
        } else if (clientY > w.top + w.height - SNAP_THRESHOLD) {
          indicator = {
            show: true,
            side: "bottom",
            target: w.id,
            top: w.top + w.height / 2,
            left: w.left,
            width: w.width,
            height: w.height / 2,
          };
        }
        break;
      }

      if (!indicator.show) {
        if (clientX < SNAP_THRESHOLD) {
          indicator = {
            show: true,
            side: "left",
            top: 0,
            left: 0,
            width: "50vw",
            height: "100vh",
          };
        } else if (clientX > window.innerWidth - SNAP_THRESHOLD) {
          indicator = {
            show: true,
            side: "right",
            top: 0,
            left: "50vw",
            width: "50vw",
            height: "100vh",
          };
        } else if (clientY < SNAP_THRESHOLD) {
          indicator = {
            show: true,
            side: "top",
            top: 0,
            left: 0,
            width: "100vw",
            height: "50vh",
          };
        } else if (clientY > window.innerHeight - SNAP_THRESHOLD) {
          indicator = {
            show: true,
            side: "bottom",
            top: "50vh",
            left: 0,
            width: "100vw",
            height: "50vh",
          };
        }
      }

      setSnapIndicator(indicator);
    },
    [windows]
  );

  const handleDrop = useCallback(() => {
    if (!snapIndicator.show || !draggedWindowId.current) return;

    const draggedId = draggedWindowId.current;
    const { side, target } = snapIndicator;

    setWindows((curr) => {
      const dragged = curr.find((w) => w.id === draggedId);
      if (!dragged || !side) return curr;

      if (target) {
        const t = curr.find((w) => w.id === target);
        if (!t) return curr;

        const halfW = t.width / 2;
        const halfH = t.height / 2;
        const updates: Record<number, WindowData> = {};

        switch (side) {
          case "left":
            updates[target] = { ...t, left: t.left + halfW, width: halfW };
            updates[draggedId] = {
              ...dragged,
              isSnapped: true,
              parent: target,
              top: t.top,
              left: t.left,
              width: halfW,
              height: t.height,
            };
            break;
          case "right":
            updates[target] = { ...t, width: halfW };
            updates[draggedId] = {
              ...dragged,
              isSnapped: true,
              parent: target,
              top: t.top,
              left: t.left + halfW,
              width: halfW,
              height: t.height,
            };
            break;
          case "top":
            updates[target] = { ...t, top: t.top + halfH, height: halfH };
            updates[draggedId] = {
              ...dragged,
              isSnapped: true,
              parent: target,
              top: t.top,
              left: t.left,
              width: t.width,
              height: halfH,
            };
            break;
          case "bottom":
            updates[target] = { ...t, height: halfH };
            updates[draggedId] = {
              ...dragged,
              isSnapped: true,
              parent: target,
              top: t.top + halfH,
              left: t.left,
              width: t.width,
              height: halfH,
            };
            break;
        }
        return curr.map((w) => updates[w.id] ?? w);
      }

      const fullW = window.innerWidth;
      const fullH = window.innerHeight;
      const snapMap: Record<SnapSide, Partial<WindowData>> = {
        left: { top: 0, left: 0, width: fullW / 2, height: fullH },
        right: { top: 0, left: fullW / 2, width: fullW / 2, height: fullH },
        top: { top: 0, left: 0, width: fullW, height: fullH / 2 },
        bottom: { top: fullH / 2, left: 0, width: fullW, height: fullH / 2 },
      };

      return curr.map((w) =>
        w.id === draggedId
          ? { ...w, isSnapped: true, parent: null, ...snapMap[side] }
          : w
      );
    });

    draggedWindowId.current = null;
    dragStartPos.current = null;
    setSnapIndicator(EMPTY_INDICATOR);
  }, [snapIndicator]);

  return (
    <div
      className="app"
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#eee",
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {snapIndicator.show && (
        <div
          className="snap-indicator"
          style={{
            position: "absolute",
            background: "rgba(0, 150, 255, 0.3)",
            border: "2px dashed rgba(0, 150, 255, 0.7)",
            borderRadius: "8px",
            top: snapIndicator.top,
            left: snapIndicator.left,
            width: snapIndicator.width,
            height: snapIndicator.height,
            pointerEvents: "none",
            transition: "all 0.2s ease",
            transform: "scale(1)",
            animation: "pulse 0.5s ease-out",
          }}
        />
      )}
      {windows.map((w) => (
        <Window
          key={w.id}
          windowData={w}
          onClose={closeWindow}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDrop={handleDrop}
        />
      ))}
      <button
        className="add-button"
        onClick={createWindow}
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "#0096ff",
          color: "#fff",
          fontSize: "24px",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
        }}
      >
        +
      </button>

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.7; }
            50% { transform: scale(1); opacity: 1; }
            100% { transform: scale(0.98); opacity: 0.85; }
          }
        `}
      </style>
    </div>
  );
};

export default App;
