const fileInput = document.getElementById('fileInput');
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const speedControl = document.getElementById('speedControl');
const volumeControl = document.getElementById('volumeControl');
const saveButton = document.getElementById('saveButton');
const canvas = document.getElementById('waveform');
const canvasCtx = canvas.getContext('2d');

let audioContext, audioBuffer, sourceNode, gainNode, isPlaying = false;

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    const arrayBuffer = await file.arrayBuffer();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    drawWaveform(audioBuffer);
    enableControls();
  }
});

playButton.addEventListener('click', () => {
  if (isPlaying) return;
  playAudio();
});

stopButton.addEventListener('click', () => {
  if (sourceNode) sourceNode.stop();
  isPlaying = false;
});

speedControl.addEventListener('input', (event) => {
  if (sourceNode) sourceNode.playbackRate.value = event.target.value;
});

volumeControl.addEventListener('input', (event) => {
  if (gainNode) gainNode.gain.value = event.target.value;
});

saveButton.addEventListener('click', () => {
  const speed = parseFloat(speedControl.value);
  const volume = parseFloat(volumeControl.value);

  const wavBlob = bufferToWav(audioBuffer, speed, volume);
  const url = URL.createObjectURL(wavBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'edited.wav';
  a.click();
});

function enableControls() {
  playButton.disabled = false;
  stopButton.disabled = false;
  saveButton.disabled = false;
}

function playAudio() {
  if (!audioContext || !audioBuffer) return;

  sourceNode = audioContext.createBufferSource();
  gainNode = audioContext.createGain();

  sourceNode.buffer = audioBuffer;
  sourceNode.playbackRate.value = speedControl.value;
  gainNode.gain.value = volumeControl.value;

  // Удалено: sourceNode.loop = loopControl.checked;

  sourceNode.connect(gainNode);
  gainNode.connect(audioContext.destination);

  sourceNode.start(0);
  isPlaying = true;

  sourceNode.onended = () => (isPlaying = false);
}

function drawWaveform(buffer) {
  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / canvas.width);
  const amp = canvas.height / 2;

  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  canvasCtx.fillStyle = '#ddd';
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = '#007bff';
  canvasCtx.beginPath();

  for (let i = 0; i < canvas.width; i++) {
    const min = Math.min(...data.slice(i * step, (i + 1) * step));
    const max = Math.max(...data.slice(i * step, (i + 1) * step));
    canvasCtx.moveTo(i, amp - min * amp);
    canvasCtx.lineTo(i, amp - max * amp);
  }
  canvasCtx.stroke();
}

function bufferToWav(buffer, speed = 1, volume = 1) {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate + speed; // Убедитесь, что скорость применяется правильно
  const length = Math.floor(buffer.length / speed);
  const wavLength = length * numOfChan * 2 + 44;
  const wavBuffer = new ArrayBuffer(wavLength);
  const view = new DataView(wavBuffer);

  let offset = 0;
  const writeString = (str) => {
        for (let i = 0; i < str.length; i++) {
      view.setUint8(offset++, str.charCodeAt(i));
    }
  };

  writeString('RIFF');
  view.setUint32(offset, 36 + length * numOfChan * 2, true);
  offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, numOfChan, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * numOfChan * 2, true);
  offset += 4;
  view.setUint16(offset, numOfChan * 2, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;
  writeString('data');
  view.setUint32(offset, length * numOfChan * 2, true);
  offset += 4;

  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numOfChan; channel++) {
      const sample = buffer.getChannelData(channel)[Math.floor(i * speed)];
      const amplified = Math.max(-1, Math.min(1, sample * volume));
      const int16 = amplified < 0 ? amplified * 0x8000 : amplified * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

const speedValue = document.getElementById('speedValue');
const volumeValue = document.getElementById('volumeValue');

speedControl.addEventListener('input', (event) => {
  const speed = event.target.value;
  speedValue.textContent = `${speed}x`;
  if (sourceNode) sourceNode.playbackRate.value = speed;
});

volumeControl.addEventListener('input', (event) => {
  const volume = event.target.value;
  volumeValue.textContent = `${Math.round(volume * 100)}%`;
  if (gainNode) gainNode.gain.value = volume;
});
