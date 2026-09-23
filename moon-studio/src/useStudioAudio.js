import {assetUrl} from './assetUrl.js';
import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_SOURCE = assetUrl('/assets/demo-music.mp3');
const DEFAULT_LABEL = '原创示例配乐';
const MAX_BYTES = 20 * 1024 * 1024;
const RECORD_LIMIT_MS = 60_000;
const AUDIO_EXTENSION = /\.(mp3|wav|wave|ogg|oga|opus|m4a|aac|flac|aif|aiff|webm|mpga|mpeg)$/i;
const AUDIO_MIME_BY_EXTENSION = {
  mp3: 'audio/mpeg', mpga: 'audio/mpeg', mpeg: 'audio/mpeg',
  wav: 'audio/wav', wave: 'audio/wav',
  ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg',
  m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac',
  aif: 'audio/aiff', aiff: 'audio/aiff', webm: 'audio/webm',
};

function validateAudio(value) {
  if (!(value instanceof Blob)) return '请选择一个音频文件。';
  if (!value.size) return '这个音频文件是空的，请重新选择。';
  if (value.size > MAX_BYTES) return '音频不能超过 20 MB，请换一个较小的文件。';
  const mime = (value.type || '').split(';')[0].toLowerCase();
  const hasAudioName = typeof value.name === 'string' && AUDIO_EXTENSION.test(value.name);
  if (!mime.startsWith('audio/') && !((!mime || mime === 'application/octet-stream') && hasAudioName)) {
    return '请选择音频文件，例如 MP3、WAV、M4A、OGG 或 FLAC。';
  }
  return '';
}

function microphoneError(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return '麦克风权限未开启。允许此页面使用麦克风后，可以再次录音。';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return '没有找到麦克风，请连接或启用麦克风后再试。';
    case 'NotReadableError':
    case 'TrackStartError':
      return '麦克风暂时无法使用，可能正被其他程序占用。';
    case 'SecurityError':
      return '录音需要安全连接，请使用 HTTPS 或本机预览地址。';
    case 'NotSupportedError':
      return '当前浏览器不支持这种录音方式，可以改为上传音频。';
    default:
      return '录音没有成功开始，请检查麦克风后重试，也可以上传音频。';
  }
}

/**
 * Local-only audio playback, microphone recording and genuine audio analysis.
 * Attach audioRef to one persistent <audio ref={audio.audioRef} /> element;
 * the hook owns its src. Nothing is uploaded or synthesised by this hook.
 */
export function useStudioAudio() {
  const audioRef = useRef(null);
  const analysisRef = useRef({ level: 0, bins: null });
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [label, setLabel] = useState(DEFAULT_LABEL);
  const [error, setError] = useState('');
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [blob, setBlob] = useState(null);

  const mountedRef = useRef(true);
  const contextRef = useRef(null);
  const playbackGraphRef = useRef(null);
  const activeAnalyserRef = useRef(null);
  const analysisModeRef = useRef(null);
  const animationRef = useRef(0);
  const objectUrlRef = useRef(null);
  const sourceRef = useRef(DEFAULT_SOURCE);
  const durationFallbackRef = useRef(0);
  const playPendingRef = useRef(false);
  const playEpochRef = useRef(0);
  const recordEpochRef = useRef(0);
  const microphonePendingRef = useRef(null);
  const recordingSessionRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const stopAnalysis = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = 0;
    activeAnalyserRef.current = null;
    analysisModeRef.current = null;
    analysisRef.current = { level: 0, bins: null };
  }, []);

  const startAnalysis = useCallback((analyser, mode, startedAt = 0) => {
    stopAnalysis();
    activeAnalyserRef.current = analyser;
    analysisModeRef.current = mode;
    const bins = new Uint8Array(analyser.frequencyBinCount);
    const waveform = new Float32Array(analyser.fftSize);
    let lastClockUpdate = 0;
    let smoothedLevel = 0;
    const tick = () => {
      if (!mountedRef.current || activeAnalyserRef.current !== analyser) return;
      try {
        analyser.getByteFrequencyData(bins);
        analyser.getFloatTimeDomainData(waveform);
        let energy = 0;
        for (const sample of waveform) energy += sample * sample;
        // A fixed display gain, applied to measured RMS rather than fake data.
        const rms = Math.sqrt(energy / waveform.length);
        smoothedLevel = smoothedLevel * 0.65 + Math.min(1, rms * 3.5) * 0.35;
        analysisRef.current = { level: smoothedLevel, bins };
        if (mode === 'microphone') {
          const now = performance.now();
          if (now - lastClockUpdate >= 100) {
            setTime(Math.min(60, Math.max(0, (now - startedAt) / 1000)));
            lastClockUpdate = now;
          }
        }
        animationRef.current = requestAnimationFrame(tick);
      } catch {
        stopAnalysis();
      }
    };
    tick();
  }, [stopAnalysis]);

  const ensureContext = useCallback(() => {
    if (!contextRef.current || contextRef.current.state === 'closed') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        const unsupported = new Error('当前浏览器不支持声音可视化，请使用新版浏览器。');
        unsupported.name = 'NotSupportedError';
        throw unsupported;
      }
      contextRef.current = new AudioContext();
    }
    return contextRef.current;
  }, []);

  const ensurePlaybackGraph = useCallback(() => {
    const element = audioRef.current;
    if (!element) throw new Error('播放器尚未准备好，请稍后重试。');
    const context = ensureContext();
    let graph = playbackGraphRef.current;
    if (!graph || graph.element !== element) {
      graph?.source.disconnect();
      graph?.analyser.disconnect();
      const source = context.createMediaElementSource(element);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      analyser.connect(context.destination);
      graph = { element, source, analyser };
      playbackGraphRef.current = graph;
    }
    return { context, analyser: graph.analyser };
  }, [ensureContext]);

  const releaseMicrophone = useCallback((session) => {
    if (!session) return;
    for (const track of session.stream?.getTracks() || []) {
      track.onended = null;
      track.stop();
    }
    for (const node of [session.source, session.analyser, session.silentGain]) {
      try { node?.disconnect(); } catch { /* Already disconnected. */ }
    }
    if (activeAnalyserRef.current === session.analyser) stopAnalysis();
  }, [stopAnalysis]);

  const stopRecording = useCallback((discard = false) => {
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    recordingTimerRef.current = null;
    const pending = microphonePendingRef.current;
    if (pending) pending.cancelled = true;
    const session = recordingSessionRef.current;
    if (session) {
      if (discard) session.discard = true;
      if (!session.stopping) {
        session.stopping = true;
        session.stoppedAt = performance.now();
        if (session.recorder.state !== 'inactive') {
          try {
            // Stop the recorder before tracks; onstop receives the final chunk.
            session.recorder.stop();
          } catch {
            session.discard = true;
            recordingSessionRef.current = null;
            if (mountedRef.current) setError('录音未能保存，请重新录制。');
          }
        }
      }
      releaseMicrophone(session);
    }
    if (mountedRef.current) setRecording(false);
  }, [releaseMicrophone]);

  // Safe for leaving the sound workspace: never starts playback or requests
  // microphone access. Finished recording data still flows through onstop.
  const stop = useCallback(() => {
    if (!mountedRef.current) return false;
    playEpochRef.current += 1;
    playPendingRef.current = false;
    audioRef.current?.pause();
    stopRecording();
    stopAnalysis();
    setPlaying(false);
    return true;
  }, [stopAnalysis, stopRecording]);

  const loadBlob = useCallback((nextBlob, nextLabel) => {
    if (nextBlob !== null) {
      const validation = validateAudio(nextBlob);
      if (validation) {
        if (mountedRef.current) setError(validation);
        return false;
      }
    }
    let url;
    try {
      url = nextBlob === null ? DEFAULT_SOURCE : URL.createObjectURL(nextBlob);
    } catch {
      if (mountedRef.current) setError('这个音频暂时无法打开，请重新选择。');
      return false;
    }
    stopRecording(true);
    recordEpochRef.current += 1;
    playEpochRef.current += 1;
    playPendingRef.current = false;
    stopAnalysis();
    const element = audioRef.current;
    element?.pause();
    const previousUrl = objectUrlRef.current;
    objectUrlRef.current = nextBlob === null ? null : url;
    sourceRef.current = url;
    durationFallbackRef.current = 0;
    if (element) {
      element.src = url;
      element.load();
    }
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    if (mountedRef.current) {
      setBlob(nextBlob);
      setLabel(nextLabel || (nextBlob === null ? DEFAULT_LABEL : '我的中秋录音'));
      setError('');
      setPlaying(false);
      setTime(0);
      setDuration(0);
    }
    return true;
  }, [stopAnalysis, stopRecording]);

  const importFile = useCallback((file) => {
    const validation = validateAudio(file);
    if (validation) {
      if (mountedRef.current) setError(validation);
      return false;
    }
    const mime = (file.type || '').split(';')[0].toLowerCase();
    let imported = file;
    if (!mime || mime === 'application/octet-stream') {
      const extension = file.name.match(AUDIO_EXTENSION)[1].toLowerCase();
      // Keep the exact bytes, but give the local persistence layer an audio/*
      // MIME. This is a container hint, not a promise that decoding will succeed.
      imported = new Blob([file], { type: AUDIO_MIME_BY_EXTENSION[extension] });
    }
    return loadBlob(imported, file.name || '我的音频');
  }, [loadBlob]);

  const togglePlay = useCallback(async () => {
    if (!mountedRef.current) return false;
    const element = audioRef.current;
    if (!element) {
      setError('播放器尚未准备好，请稍后重试。');
      return false;
    }
    if (microphonePendingRef.current || recordingSessionRef.current) {
      setError('请先结束录音，再播放音频。');
      return false;
    }
    const epoch = ++playEpochRef.current;
    if (!element.paused || playPendingRef.current) {
      playPendingRef.current = false;
      element.pause();
      setPlaying(false);
      stopAnalysis();
      return true;
    }
    playPendingRef.current = true;
    setError('');
    try {
      // Created only in this user action, never during mount or file import.
      const { context, analyser } = ensurePlaybackGraph();
      if (context.state === 'suspended') await context.resume();
      if (!mountedRef.current || epoch !== playEpochRef.current) return false;
      if (element.ended) element.currentTime = 0;
      await element.play();
      if (!mountedRef.current || epoch !== playEpochRef.current) return false;
      setPlaying(true);
      startAnalysis(analyser, 'playback');
      return true;
    } catch (playError) {
      if (!mountedRef.current || epoch !== playEpochRef.current) return false;
      setPlaying(false);
      stopAnalysis();
      if (playError?.name !== 'AbortError') {
        setError(playError?.name === 'NotAllowedError'
          ? '浏览器暂时阻止了播放，请再次点击播放按钮。'
          : playError?.name === 'NotSupportedError'
            ? '当前浏览器无法播放这个音频，请尝试 MP3 或 WAV 文件。'
            : '音频暂时无法播放，请检查文件后重试。');
      }
      return false;
    } finally {
      if (epoch === playEpochRef.current) playPendingRef.current = false;
    }
  }, [ensurePlaybackGraph, startAnalysis, stopAnalysis]);

  const toggleRecord = useCallback(async () => {
    if (!mountedRef.current) return false;
    if (microphonePendingRef.current || recordingSessionRef.current) {
      stopRecording();
      return true;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(window.isSecureContext
        ? '当前浏览器不支持录音，可以改为上传音频。'
        : '录音需要安全连接，请使用 HTTPS 或本机预览地址。');
      return false;
    }
    const epoch = ++recordEpochRef.current;
    const pending = { epoch, cancelled: false };
    // Keep the pending request until it settles, so rapid clicks cannot open
    // multiple permission prompts or microphone streams.
    microphonePendingRef.current = pending;
    setRecording(true);
    setPlaying(false);
    setError('');
    setTime(0);
    setDuration(0);
    playEpochRef.current += 1;
    playPendingRef.current = false;
    audioRef.current?.pause();
    stopAnalysis();
    let stream;
    let session;
    try {
      const context = ensureContext();
      if (context.state === 'suspended') await context.resume();
      if (!mountedRef.current || pending.cancelled || epoch !== recordEpochRef.current) return false;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (!mountedRef.current || pending.cancelled || epoch !== recordEpochRef.current) {
        for (const track of stream.getTracks()) track.stop();
        return false;
      }
      const preferredMime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = new MediaRecorder(stream, {
        ...(preferredMime ? { mimeType: preferredMime } : {}),
        audioBitsPerSecond: 128000,
      });
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      const silentGain = context.createGain();
      silentGain.gain.value = 0;
      source.connect(analyser);
      analyser.connect(silentGain);
      // The analyser is active, but the microphone is never echoed to speakers.
      silentGain.connect(context.destination);
      session = {
        epoch, recorder, stream, source, analyser, silentGain, chunks: [],
        startedAt: performance.now(), stoppedAt: 0, stopping: false, discard: false,
      };
      recordingSessionRef.current = session;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) session.chunks.push(event.data);
      };
      recorder.onerror = () => {
        session.discard = true;
        stopRecording(true);
        if (mountedRef.current) setError('录音意外中断，请检查麦克风后重新录制。');
      };
      recorder.onstop = () => {
        if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
        releaseMicrophone(session);
        if (recordingSessionRef.current === session) recordingSessionRef.current = null;
        if (!mountedRef.current || session.discard || session.epoch !== recordEpochRef.current) {
          session.chunks.length = 0;
          return;
        }
        setRecording(false);
        const recorded = new Blob(session.chunks, {
          type: recorder.mimeType || session.chunks[0]?.type || 'audio/webm',
        });
        session.chunks.length = 0;
        if (!recorded.size) {
          setError('没有录到声音数据，请检查麦克风后再试。');
          setTime(0);
          return;
        }
        const seconds = Math.min(60, Math.max(0, ((session.stoppedAt || performance.now()) - session.startedAt) / 1000));
        if (loadBlob(recorded, '我的中秋录音')) {
          // Some browsers leave recorded WebM's metadata duration as Infinity.
          // Preserve the measured recording length until finite metadata arrives.
          durationFallbackRef.current = seconds;
          setDuration(seconds);
        }
      };
      for (const track of stream.getAudioTracks()) track.onended = () => stopRecording();
      recorder.start(250);
      recordingTimerRef.current = setTimeout(() => stopRecording(), RECORD_LIMIT_MS);
      startAnalysis(analyser, 'microphone', session.startedAt);
      return true;
    } catch (recordError) {
      if (session) {
        session.discard = true;
        stopRecording(true);
        releaseMicrophone(session);
        if (recordingSessionRef.current === session) recordingSessionRef.current = null;
      } else if (stream) {
        for (const track of stream.getTracks()) track.stop();
      }
      if (mountedRef.current && !pending.cancelled && epoch === recordEpochRef.current) {
        setError(microphoneError(recordError));
      }
      return false;
    } finally {
      if (microphonePendingRef.current === pending) microphonePendingRef.current = null;
      if (mountedRef.current && !recordingSessionRef.current) {
        setRecording(false);
        setTime(0);
        const value = audioRef.current?.duration;
        setDuration(Number.isFinite(value) && value > 0 ? value : durationFallbackRef.current);
      }
    }
  }, [ensureContext, loadBlob, releaseMicrophone, startAnalysis, stopAnalysis, stopRecording]);

  useEffect(() => {
    mountedRef.current = true;
    const element = audioRef.current;
    const updateDuration = () => {
      if (!mountedRef.current || microphonePendingRef.current || recordingSessionRef.current) return;
      setDuration(Number.isFinite(element.duration) && element.duration > 0
        ? element.duration : durationFallbackRef.current);
    };
    const onTimeUpdate = () => {
      if (mountedRef.current && !microphonePendingRef.current && !recordingSessionRef.current) {
        setTime(Number.isFinite(element.currentTime) ? element.currentTime : 0);
      }
    };
    const onPlaying = () => {
      if (!mountedRef.current) return;
      setPlaying(true);
      if (playbackGraphRef.current && analysisModeRef.current !== 'microphone') {
        startAnalysis(playbackGraphRef.current.analyser, 'playback');
      }
    };
    const onPause = () => {
      if (mountedRef.current) setPlaying(false);
      if (analysisModeRef.current === 'playback') stopAnalysis();
    };
    const onEnded = () => {
      playPendingRef.current = false;
      if (analysisModeRef.current === 'playback') stopAnalysis();
      try { element.currentTime = 0; } catch { /* Media became unavailable. */ }
      if (mountedRef.current) {
        setPlaying(false);
        setTime(0);
      }
    };
    const onError = () => {
      if (!mountedRef.current || !element.error) return;
      playPendingRef.current = false;
      setPlaying(false);
      if (analysisModeRef.current === 'playback') stopAnalysis();
      const isDefault = sourceRef.current === DEFAULT_SOURCE;
      setError(isDefault
        ? '示例配乐暂时无法加载，你可以上传音频或录一段声音。'
        : '这个音频无法解码或已经损坏，请尝试 MP3、WAV 或其他音频文件。');
    };
    const listeners = {
      loadedmetadata: updateDuration, durationchange: updateDuration,
      timeupdate: onTimeUpdate, playing: onPlaying, pause: onPause,
      ended: onEnded, error: onError,
    };
    if (element) {
      for (const [event, listener] of Object.entries(listeners)) element.addEventListener(event, listener);
      element.preload = 'metadata';
      element.src = sourceRef.current;
      element.load();
    }
    return () => {
      mountedRef.current = false;
      playEpochRef.current += 1;
      recordEpochRef.current += 1;
      playPendingRef.current = false;
      stopRecording(true);
      stopAnalysis();
      if (element) {
        for (const [event, listener] of Object.entries(listeners)) element.removeEventListener(event, listener);
        element.pause();
        element.removeAttribute('src');
        element.load();
      }
      const graph = playbackGraphRef.current;
      graph?.source.disconnect();
      graph?.analyser.disconnect();
      playbackGraphRef.current = null;
      const context = contextRef.current;
      contextRef.current = null;
      if (context && context.state !== 'closed') context.close().catch(() => {});
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    };
  }, [startAnalysis, stopAnalysis, stopRecording]);

  return {
    audioRef, analysisRef, playing, recording, label, error, time, duration, blob,
    togglePlay, importFile, toggleRecord, loadBlob, stop,
  };
}
