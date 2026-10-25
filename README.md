# 🧩 HandPuzzle Pro — AI-Powered AR Puzzle Experience

### Exploring Augmented Reality, Computer Vision & Gesture-Based Interaction

**Frame with your hands. Capture your world. Solve the puzzle.**

🌐 **Live Demo:** [https://hand-puzzle-pro.vercel.app/](https://hand-puzzle-pro.vercel.app/)

## 📖 About the Project

**HandPuzzle Pro** is an interactive, browser-based camera puzzle game developed using Next.js and MediaPipe hand tracking. The project explores concepts related to **Augmented Reality (AR), computer vision, and natural human-computer interaction** by allowing users to interact with a digital puzzle using real-time hand gestures.

Users can frame a photo using hand gestures, capture an image through their webcam, and transform it into a sliding-puzzle challenge. They can then interact with the puzzle using pinch-to-grab gestures, creating a more natural alternative to conventional mouse-based gameplay.

From an AR/VR perspective, the project demonstrates how real-world camera input, hand tracking, and gesture recognition can contribute to more immersive and intuitive digital experiences.

> **Project Focus:** Augmented Reality concepts, AI-based hand tracking, gesture recognition, and interactive digital environments.

---

## 🎯 Project Objectives

- Explore the fundamentals of AR-related interactive applications.
- Implement real-time hand tracking using computer vision.
- Enable gesture-based interaction with digital objects.
- Combine camera input with interactive puzzle generation.
- Reduce dependence on traditional input devices such as a mouse and keyboard.
- Investigate natural and intuitive human-computer interaction techniques.

---

## ✨ Key Features

- 🖐️ **Real-Time Hand Tracking** — Detect and track hand movements using MediaPipe.
- 📷 **Camera-Based Image Capture** — Capture photos using supported hand-framing gestures.
- 🤏 **Gesture-Based Controls** — Interact with puzzle tiles through pinch-to-grab movements.
- 🧩 **Dynamic Puzzle Generation** — Turn captured images into sliding puzzles.
- 🎮 **Multiple Difficulty Levels** — Challenge yourself with Easy (3×3), Medium (4×4), and Hard (5×5) modes.
- ⏱️ **Gameplay Monitoring** — Track solving time and moves.
- 🎨 **Interactive User Interface** — Experience a modern interface designed for gesture-based gameplay.
- 🌐 **Browser-Based Application** — Access the game through a compatible web browser.

*Note: The current project uses webcam-based interaction. Full spatial AR overlays, VR headset support, and immersive 3D environments are potential extensions rather than assumed existing features.*

---

## 🥽 Connection to AR/VR Technology

HandPuzzle Pro provides a practical foundation for exploring technologies relevant to Augmented Reality and Virtual Reality.

| AR/VR Concept | Implementation in HandPuzzle Pro |
|---|---|
| Computer Vision | Detecting and tracking hands through a camera |
| Gesture Recognition | Using hand movements to trigger interactions |
| Natural User Interaction | Controlling puzzle tiles without conventional mouse input |
| Real-World Input | Capturing images through the user's webcam |
| Digital Interaction | Manipulating a digital puzzle through gestures |
| Immersive Interaction Potential | A foundation for future spatial AR and VR extensions |

### Augmented Reality (AR)

AR enhances a view of the real world with digital information or objects. HandPuzzle Pro explores AR-related interaction through camera input and gesture-controlled digital content.

A future AR version could display the puzzle directly over a live camera view, position it within the physical environment, and allow users to interact with it spatially.

### Virtual Reality (VR)

VR creates an immersive, computer-generated environment, typically experienced through a headset. Although the current version is browser-based and does not require a VR headset, its gesture-based interaction system could be extended to an immersive 3D puzzle experience using WebXR.

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Next.js 16 | Web application framework |
| React 19 | Interactive user interface |
| MediaPipe | Real-time hand tracking |
| JavaScript / TypeScript | Application logic, depending on the source files |
| Vanilla CSS | Styling and visual design |
| Vercel | Deployment and hosting |

---

## 🎮 How to Play

1. Visit the [HandPuzzle Pro website](https://hand-puzzle-pro.vercel.app/).
2. Choose your preferred difficulty level.
3. Allow camera access when prompted.
4. Position your hands in front of the webcam.
5. Use the supported hand-framing gesture to capture an image.
6. Let the application generate the puzzle.
7. Use pinch-to-grab gestures to interact with the puzzle tiles.
8. Solve the puzzle and monitor your time and moves.

*Controls depend on the current implementation and supported camera configuration.*

---

## ⚙️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- npm
- [Git](https://git-scm.com/)
- A modern browser with webcam support

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### 2. Navigate to the Project

```bash
cd YOUR_PROJECT_FOLDER
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

### 5. Open the Application

Navigate to [http://localhost:3000](http://localhost:3000).

Allow webcam permission to test the camera and gesture-based features.

---

## 📸 Screenshots and Demonstration

Add real screenshots or a short GIF of your working application to help visitors understand the project.

Suggested demonstrations:

- Homepage and difficulty selection
- Hand tracking through the webcam
- Hand-framing and image capture
- Pinch-to-grab puzzle interaction
- Completed puzzle and game statistics

Example screenshot paths:

```text
screenshots/
├── homepage.png
├── hand-tracking.png
├── image-capture.png
└── puzzle-gameplay.png
```

Replace these example names with your actual screenshot files.

---

## 🔬 Future Scope

The project can be extended to explore more advanced AR/VR capabilities:

- **Live AR Puzzle Overlay:** Render puzzle elements over a live camera feed.
- **Spatial AR Placement:** Position digital puzzles within a real-world environment.
- **3D Puzzle Interaction:** Introduce depth and three-dimensional puzzle objects.
- **WebXR Integration:** Explore browser-based AR and VR experiences on compatible devices.
- **VR Headset Support:** Build an immersive puzzle environment for supported headsets.
- **Advanced Hand Interaction:** Improve gesture recognition, feedback, and interaction accuracy.
- **Multiplayer Puzzle Challenges:** Enable collaborative puzzle-solving experiences.

These enhancements could expand HandPuzzle Pro from a gesture-controlled browser game into a more comprehensive AR/VR learning project.

---

## 🎓 Academic Relevance

**Subject Area:** Augmented Reality and Virtual Reality (AR/VR)

**Related Domains:**
- Computer Vision
- Human-Computer Interaction (HCI)
- Gesture Recognition
- AI-Based Interaction
- Interactive Gaming
- Web-Based Immersive Technologies

This project demonstrates the use of camera-based hand tracking and natural gesture interaction in a digital application. It also provides a foundation for exploring spatial augmented reality, immersive interfaces, and future VR integration.

---

## 🔐 Camera Permissions and Privacy

- Camera access requires user permission.
- Camera functionality generally requires HTTPS in deployed environments, except for trusted local development origins.
- Review the application's implementation to determine how captured images and camera data are processed or stored.

---

## 👨‍💻 Project Information

**Project Name:** HandPuzzle Pro

**Category:** AR/VR Concepts, Computer Vision & Gesture-Based Gaming

**Live Application:** [hand-puzzle-pro.vercel.app](https://hand-puzzle-pro.vercel.app/)

**Built with:** Next.js, React, MediaPipe, and CSS

---

## ⭐ Conclusion

HandPuzzle Pro explores how computer vision and gesture recognition can make digital interactions more natural and engaging. By combining camera-based image capture with hand-controlled puzzle gameplay, the project demonstrates practical concepts related to AR/VR interaction and creates a foundation for future immersive experiences.

**HandPuzzle Pro — Bringing natural interaction into digital play.**
