// Yüz takibiyle menüde gezinme: başı sağa/sola/yukarı/aşağı çevirince seçim kayar,
// gülümseyince seçili buton tıklanır. MediaPipe Face Landmarker yalnızca kamera açılınca yüklenir.
const VISION_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const TURN_THRESHOLD = 0.14; // nötr duruştan bu kadar sapma bir yön sayılır
const MOVE_REPEAT_MS = 1100; // baş çevrik kaldıkça seçim bu aralıkla ilerler
const SMILE_THRESHOLD = 0.6;
const SMILE_HOLD_MS = 350;
const CLICK_COOLDOWN_MS = 2000;
const CALIBRATION_FRAMES = 20;
const SMOOTHING = 0.25; // titremeyi azaltmak için baş pozisyonu yumuşatılır (0–1, küçük = daha sakin)

const toggle = document.getElementById("faceToggle");
const preview = document.getElementById("facePreview");
const toast = document.getElementById("toast");
const grid = document.querySelector(".menu-grid");
const buttons = [...document.querySelectorAll(".menu-button")];

let landmarker;
let stream;
let running = false;
let selected = 0;
let neutral = null;
let calibration = [];
let lastMove = 0;
let smileSince = 0;
let lastClick = 0;
let lastVideoTime = -1;
let smoothed = null;

const say = (text) => {
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(say.timer);
  say.timer = setTimeout(() => { toast.hidden = true; }, 2600);
};

const columns = () => getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length || 1;

const select = (index) => {
  buttons[selected]?.classList.remove("is-face-focus");
  selected = Math.max(0, Math.min(buttons.length - 1, index));
  const button = buttons[selected];
  button.classList.add("is-face-focus");
  button.scrollIntoView({ block: "nearest", behavior: "smooth" });
};

// Burun ucunun yüz genişliğine/yüksekliğine göre konumu: başın döndüğü yönü verir.
const headPose = (points) => {
  const nose = points[1];
  const left = points[234];
  const right = points[454];
  const top = points[10];
  const chin = points[152];
  return {
    x: (nose.x - (left.x + right.x) / 2) / Math.abs(right.x - left.x),
    y: (nose.y - (top.y + chin.y) / 2) / Math.abs(chin.y - top.y),
  };
};

const smileScore = (blendshapes) => {
  const categories = blendshapes?.[0]?.categories || [];
  const score = (name) => categories.find((category) => category.categoryName === name)?.score || 0;
  return (score("mouthSmileLeft") + score("mouthSmileRight")) / 2;
};

const handle = (result, now) => {
  const points = result.faceLandmarks?.[0];
  if (!points) return;

  const raw = headPose(points);
  smoothed = smoothed
    ? { x: smoothed.x + (raw.x - smoothed.x) * SMOOTHING, y: smoothed.y + (raw.y - smoothed.y) * SMOOTHING }
    : raw;
  const pose = smoothed;
  if (!neutral) {
    calibration.push(pose);
    if (calibration.length >= CALIBRATION_FRAMES) {
      neutral = {
        x: calibration.reduce((sum, p) => sum + p.x, 0) / calibration.length,
        y: calibration.reduce((sum, p) => sum + p.y, 0) / calibration.length,
      };
      say("Hazır! Başını çevirerek gez, gülümseyerek seç.");
    }
    return;
  }

  // Kamera görüntüsü aynalı değil: kişi başını sağına çevirince burun görüntüde sola kayar.
  const dx = -(pose.x - neutral.x);
  const dy = pose.y - neutral.y;
  if (now - lastMove > MOVE_REPEAT_MS) {
    let step = 0;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > TURN_THRESHOLD) step = dx > 0 ? 1 : -1;
    else if (Math.abs(dy) > TURN_THRESHOLD * 0.8) step = (dy > 0 ? 1 : -1) * columns();
    if (step) {
      select(selected + step);
      lastMove = now;
    }
  }

  if (smileScore(result.faceBlendshapes) > SMILE_THRESHOLD) {
    if (!smileSince) smileSince = now;
    if (now - smileSince > SMILE_HOLD_MS && now - lastClick > CLICK_COOLDOWN_MS) {
      lastClick = now;
      buttons[selected].click();
    }
  } else {
    smileSince = 0;
  }
};

const loop = () => {
  if (!running) return;
  if (preview.readyState >= 2 && preview.currentTime !== lastVideoTime) {
    lastVideoTime = preview.currentTime;
    const now = performance.now();
    handle(landmarker.detectForVideo(preview, now), now);
  }
  requestAnimationFrame(loop);
};

const start = async () => {
  toggle.disabled = true;
  say("Kamera açılıyor…");
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    preview.srcObject = stream;
    preview.hidden = false;
    await preview.play();

    if (!landmarker) {
      say("Yüz takibi yükleniyor…");
      const { FilesetResolver, FaceLandmarker } = await import(`${VISION_URL}/vision_bundle.mjs`);
      const files = await FilesetResolver.forVisionTasks(`${VISION_URL}/wasm`);
      landmarker = await FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
      });
    }

    neutral = null;
    calibration = [];
    smoothed = null;
    running = true;
    toggle.classList.add("is-active");
    toggle.setAttribute("aria-pressed", "true");
    toggle.setAttribute("aria-label", "Yüz takibini kapat");
    select(selected);
    say("Kameraya düz bak, ayarlanıyor…");
    loop();
  } catch (error) {
    console.error("Yüz takibi başlatılamadı:", error);
    stop();
    say(error?.name === "NotAllowedError" ? "Kamera izni verilmedi." : "Kamera açılamadı.");
  } finally {
    toggle.disabled = false;
  }
};

function stop() {
  running = false;
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  preview.srcObject = null;
  preview.hidden = true;
  buttons[selected]?.classList.remove("is-face-focus");
  toggle.classList.remove("is-active");
  toggle.setAttribute("aria-pressed", "false");
  toggle.setAttribute("aria-label", "Yüz takibini aç");
}

if (!navigator.mediaDevices?.getUserMedia) {
  toggle.hidden = true;
} else {
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (running) stop();
    else start();
  });
}
