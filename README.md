# Personal Voice AI Platform

**An open-source, self-hostable voice AI platform** — build production voice agents with a drag-and-drop workflow builder. From zero to a working bot in under 2 minutes.

<p align="center">
  <a href="#-get-started">
    <img src="https://img.shields.io/badge/⚡_Run_locally-One_command-111827?style=for-the-badge" alt="Run locally">
  </a>
</p>

<p align="center">
  <a href="LICENSE">📜 BSD 2-Clause</a> &nbsp;·&nbsp;
  <a href="README.zh-CN.md">🌐 中文</a>
</p>

<p align="center">
  <img src="docs/images/hero.gif" alt="Voice AI workflow builder in action" width="80%">
</p>

- **100% open source**, self-hostable, and designed for personal control
- **Full control & transparency** — every line of code is open, with flexible LLM / TTS / STT integration
- **Built as a flexible personal project** for experimenting with real-time voice interactions

## 🎥 Featured

<div align="center">
  <a href="https://www.youtube.com/watch?v=xD9JEvfCH9k">
    <img src="https://img.youtube.com/vi/xD9JEvfCH9k/maxresdefault.jpg" alt="Voice AI project walkthrough" width="80%" style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
  </a>
  <br>
  <em>A hands-on look at the voice AI project</em>
</div>

<details>
<summary>📺 Prefer a 2-minute product walkthrough? Click here.</summary>

<div align="center">
  <a href="https://youtu.be/9gPneyf9M9w">
    <img src="docs/images/video_thumbnail_1.png" alt="Watch the voice AI demo video" width="70%" style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
  </a>
</div>

</details>

## ⚖️ Project Focus

This project focuses on self-hosted voice AI, flexible provider integrations, and source-level customization.


## 🚀 Get Started

##### Download and set up the project locally

> **Note**
> We collect anonymous usage data to improve the product. You can opt out by setting the `ENABLE_TELEMETRY` to `false` in the below command.

> **Note**
> To run the platform on a remote server, adapt the Docker setup for your hosting environment.

```bash
docker compose up --build
```

> **Note**
> First startup may take 2-3 minutes to download all images. Once running, open http://localhost:3010 to create your first AI voice assistant!
> For common issues and solutions, see 🔧 **[Troubleshooting](docs/troubleshooting.md)**.

### 🎙️ Your First Voice Bot

1. Open [http://localhost:3010](http://localhost:3010) in your browser.
2. Pick **Inbound** or **Outbound**, name your bot (e.g. _Lead Qualification_), and describe the use case in 5–10 words (e.g. _Screen insurance form submissions for purchase intent_).
3. Click **Web Call** — you're talking to your bot.

> 🔑 **No API keys needed for local testing.** The project supports auto-generated keys and configurable LLM / TTS / STT providers. Connect your own keys for LLM, TTS, STT, or Telephony (e.g. Twilio, Vonage, Telnyx) anytime.

## Features

### Voice Capabilities

- Telephony: Built-in telephony integration like Twilio, Vonage, Vobiz, Cloudonix (easily add others), with support for transferring calls to human agents
- Languages: English support (expandable to other languages)
- Custom Models: Bring your own TTS/STT models
- Real-time Processing: Low-latency voice interactions

### Developer Experience

- Zero Config Start: Auto-generated API keys for instant testing
- Python-Based: Built on Python for easy customization
- Docker-First: Containerized for consistent deployments
- Modular Architecture: Swap components as needed

### Testing & Quality

- **Test Mode**: Try your agent end-to-end before publishing, with no production calls or data affected
- **In-Dashboard Web Calls**: Talk to your bot directly while building — no telephony setup required
- **QA Node**: A built-in workflow node that analyzes prompt quality across your other nodes

## Deployment Options

### Local Development

Refer to the local setup instructions in the `docs` directory.

### Self-Hosted Deployment

For deployment with HTTPS, adapt the Docker configuration to your server and reverse proxy.

### Cloud Version

This project is intended for self-hosted use.

## 📚Documentation

Project documentation is available in the `docs` directory.

## 📦 SDKs

- **Python SDK** — see `sdk/python`
- **Node SDK** — see `sdk/typescript`

## 🤝Community & Support

This is a personal project. Use GitHub Issues for bug reports, ideas, and development notes.

## 🙌 Contributing

This project is 100% open source and intended for experimentation, customization, and self-hosting.

### Getting Started

- Fork the repository
- Create your feature branch (git checkout -b feature/AmazingFeature)
- Commit your changes (git commit -m 'Add some AmazingFeature')
- Push to the branch (git push origin feature/AmazingFeature)
- Open a Pull Request

## ⭐ Star History

This project is developed and maintained as a personal open-source workspace.

## 📄 License

This project is licensed under the [BSD 2-Clause License](LICENSE), allowing it to be used, modified, and distributed freely.

## 🏢 About

Built as a personal project for exploring open and accessible voice AI.

<br><br><br>

  <p align="center">
    <a href="https://github.com/repos/stargazers">⭐ Star us on GitHub</a> |
    <a href="#-get-started">⚡ Run Locally</a>
  </p>
