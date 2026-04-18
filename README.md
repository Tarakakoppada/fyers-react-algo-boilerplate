# 🚀 High-Performance Algorithmic Trading Boilerplate

A modern, multi-threaded algorithmic trading boilerplate designed for low-latency execution, real-time WebSocket streaming, and dynamic risk management. 

Built with **React (Next.js)**, **Python**, and **SQLite (WAL Mode)** for zero-lock concurrency.

## 🧠 System Architecture

```mermaid
graph TD;
    subgraph Frontend
    UI[React / Next.js Dashboard]
    end

    subgraph Backend
    API[Python REST API]
    ORCH[Python Multi-Threaded Orchestrator]
    DB[(SQLite WAL Database)]
    end

    subgraph External Brokers
    WS((Fyers/Dhan WebSockets))
    EXEC((Broker Order Routing API))
    end

    UI <-->|JSON Payloads| API
    API <-->|Read/Write State| DB
    ORCH <-->|Async Read/Write| DB
    WS -->|Tick-by-Tick Data Stream| ORCH
    ORCH -->|Triggered Limit Orders| EXEC
