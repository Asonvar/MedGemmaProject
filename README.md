# 🏥 MediGemma-X

**Bridging the gap between AI and clinical trust through interpretability.**

MediGemma-X is an interface and clinical demonstration layer for [MedGemma 1.5 (4B)](https://huggingface.co/google/medgemma-1.5-4b-it). It transforms a powerful Vision-Language Model into a highly usable tool for doctors, featuring secure, privacy-preserving inference for radiology and pathology scans.

---

## ✨ Key Features
- **Multimodal AI Analysis:** Advanced interpretation of medical images (DICOM, JPG, PNG) coupled with clinician-specified text prompts.
- **Modern Clinical Dashboard:** A sleek, reactive frontend UI built with React & Vite, featuring glassmorphism and specialized user roles (Patient vs. Doctor).
- **Decoupled Architecture:** Heavy AI inference is offloaded to Google Colab GPUs, while the UI runs lightning-fast locally on the clinician's machine.
- 🚧 *(In Progress)* **Visual Grounding:** Emphasizing transparency by drawing bounding boxes around identified diseases (e.g., Pneumonia).
- 🚧 *(In Progress)* **Structured Reporting:** Standardized JSON outputs conforming to EHR system structures.

---

## 🛠️ Tech Stack
- **Frontend Dashboard:** React, Vite, Vanilla CSS, `lucide-react`
- **AI Backend / Inference API:** Google Colab, Gradio (`@gradio/client`), PyTorch
- **Core Model:** `google/medgemma-1.5-4b-it` leveraging 4-bit quantization via `bitsandbytes`.

---

## 🚀 Getting Started

To run the full application pipeline, you need to launch both the **Backend API** (Google Colab) and the **Frontend Dashboard** (Local Machine).

### 1. Launch the AI Backend
1. Open the included `MedGemmaProject.ipynb` file in [Google Colab](https://colab.research.google.com/).
2. Under **Runtime > Change runtime type**, ensure **T4 GPU** is selected.
3. Make sure you have added your Hugging Face Token as a Secret named `HF_TOKEN` with notebook access enabled.
4. Click **Runtime > Run all**.
5. Wait for the model to download and the dependencies to install. Scroll to the bottom of the output cell to find your public URL (e.g., `https://xxxx-xxxx.gradio.live`). **Copy this URL.**

### 2. Launch the Frontend UI
1. Open up this project in VS Code (or your preferred terminal).
2. Navigate into the frontend directory:
   ```bash
   cd frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Click on the `http://localhost:5173` link that appears to view the application.

### 3. Connect the Two
- On the local Dashboard login screen, enter any credentials to enter the **Doctor** view.
- Paste the copied `gradio.live` link from Colab into the **AI Backend Connection** box.
- Click **Connect**. You are now ready to upload scans and perform clinical inference!

---

## 🔒 License & Usage
This is a prototype layer for Google MedGemma. Ensure you have accepted the Hugging Face gated model agreement for MedGemma 1.5 before running the backend. *This project is for demonstration and research purposes only and does not constitute medical advice.*
