import { useState, useRef, useEffect, useCallback } from 'react';
import { speakingApi } from '../api/speakingApi';
import type { BackgroundMusicDto } from '../types/speakingTypes';

export function useBackgroundMusic(lessonId: number | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fix #2: volumeRef là nguồn sự thật "live", volume state để render slider UI
  const volumeRef = useRef<number>(0.3);
  const [volume, setVolume] = useState<number>(0.3);

  // Ghi nhớ trạng thái đang phát một cách đồng bộ qua ref
  const isPlayingRef = useRef<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [musics, setMusics] = useState<BackgroundMusicDto[]>([]);
  const [selectedMusicId, setSelectedMusicId] = useState<number | null>(null);

  // Hàm load/reload danh sách nhạc cho bài học
  const loadMusics = useCallback(async () => {
    if (!lessonId) {
      setMusics([]);
      setSelectedMusicId(null);
      return;
    }
    try {
      const res = await speakingApi.getMusicsForLesson(lessonId);
      if (res.success && res.data) {
        setMusics(res.data);
      }
    } catch (err) {
      console.error('[BackgroundMusic] Lỗi khi tải danh sách nhạc:', err);
    }
  }, [lessonId]);

  useEffect(() => {
    loadMusics();
  }, [loadMusics]);

  // Khi selectedMusicId hoặc danh sách bài nhạc thay đổi -> rebuild AudioElement
  useEffect(() => {
    // Lưu lại trạng thái xem trước khi đổi bài nhạc có đang phát hay không
    const wasPlaying = isPlayingRef.current;

    // Dọn dẹp audio cũ
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.src = '';
      audioRef.current = null;
    }

    if (!selectedMusicId) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsLoading(false);
      return;
    }

    const music = musics.find((m) => m.musicId === selectedMusicId);
    if (!music || !music.audioUrl) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsLoading(false);
      return;
    }

    const audio = new Audio(music.audioUrl);
    audio.loop = true;

    // onended fallback dự phòng cho browser lặp ngắt quãng
    audio.onended = () => {
      audio.currentTime = 0;
      void audio.play().catch((err) => {
        console.warn('[BackgroundMusic] Fallback replay loop warning:', err);
      });
    };

    // Đọc trực tiếp từ volumeRef mới nhất, tránh stale closure
    audio.volume = volumeRef.current;
    audioRef.current = audio;
    setIsLoading(true);

    const handleCanPlay = () => {
      setIsLoading(false);
    };
    const handleError = () => {
      console.error('[BackgroundMusic] Không thể tải file nhạc:', music.audioUrl);
      setIsLoading(false);
    };

    audio.addEventListener('canplaythrough', handleCanPlay, { once: true });
    audio.addEventListener('error', handleError, { once: true });

    // VẤN ĐỀ 2 ĐÃ ĐƯỢC XỬ LÝ:
    // Nếu trước đó đang trong trạng thái phát/thu âm (wasPlaying === true),
    // tự động phát tiếp bài mới ngay lập tức mà không bị mất tiếng!
    if (wasPlaying) {
      audio.currentTime = 0;
      audio.play()
        .then(() => {
          setIsPlaying(true);
          isPlayingRef.current = true;
        })
        .catch((err) => {
          console.warn('[BackgroundMusic] Tự động phát nhạc mới bị chặn:', err);
          setIsPlaying(false);
          isPlayingRef.current = false;
        });
    } else {
      setIsPlaying(false);
      isPlayingRef.current = false;
    }

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [selectedMusicId, musics]);

  // play() bọc try/catch xử lý Autoplay Policy Promise
  const play = useCallback(async () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0; // reset về đầu bài
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      isPlayingRef.current = true;
    } catch (err) {
      console.warn('[BackgroundMusic] Play() bị chặn hoặc đang load file:', err);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  // changeVolume cập nhật tức thì cả ref và audio element
  const changeVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    volumeRef.current = clamped;
    setVolume(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  return {
    musics,
    selectedMusicId,
    setSelectedMusicId,
    volume,
    changeVolume,
    isPlaying,
    isLoading,
    play,
    pause,
    refreshMusics: loadMusics,
  };
}
