// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import { BrowserRouter } from "react-router-dom";
// import './index.css'
// // import App from './App.jsx'
// import '@fortawesome/fontawesome-free/css/all.min.css';

// // import 'bootstrap/dist/css/bootstrap.min.css';

// import React from 'react'
// import ReactDOM from 'react-dom/client'
// import App from './App.jsx'
// import 'antd/dist/reset.css'   // ✅ required since AntD v5
// import './index.css'
// import { AuthProvider } from "./AuthContext.jsx";

// ReactDOM.createRoot(document.getElementById('root')).render(
//   // <React.StrictMode>
//   //   <App />
//   // </React.StrictMode>
  

// <BrowserRouter>
//   <AuthProvider>
//     <App />
//   </AuthProvider>
// </BrowserRouter>
// )
// // import React from "react";
// // import ReactDOM from "react-dom/client";
// // import App from "./App.jsx";

// // import "@fortawesome/fontawesome-free/css/all.min.css";
// // import "antd/dist/reset.css";
// // import "./index.css";

// // ReactDOM.createRoot(document.getElementById("root")).render(
// //   <React.StrictMode>
// //     <App />
// //   </React.StrictMode>
// // );
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./AuthContext.jsx";

import "@fortawesome/fontawesome-free/css/all.min.css";
import "antd/dist/reset.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);