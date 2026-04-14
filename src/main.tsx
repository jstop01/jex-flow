import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { MappingListPage } from "./pages/MappingListPage.tsx";
import { MiniMapOnlyPage } from "./pages/MiniMapOnlyPage.tsx";
import "./index.css";

// root 엘리먼트에서 data-area 속성 읽기 또는 URL 파라미터에서 읽기
const rootElement = document.getElementById("root");
const urlParams = new URLSearchParams(window.location.search);
const area = urlParams.get("area") || rootElement?.getAttribute("data-area") || "";

// area에 따라 다른 컴포넌트 렌더링
const getComponent = () => {
  switch (area) {
    case "mapping-list":
      return <MappingListPage />;
    case "minimap-only":
      return <MiniMapOnlyPage />;
    default:
      return <App />;
  }
};

createRoot(rootElement!).render(getComponent());
