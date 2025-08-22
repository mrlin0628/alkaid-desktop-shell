import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte/svelte5';
import Desktop from './Desktop.svelte';

// Mock HTMLVideoElement for testing
Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

describe('Desktop Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders desktop container with full viewport', async () => {
    render(Desktop, {
      props: {
        backgroundType: 'color',
        backgroundColor: '#0a0a0a'
      }
    });

    const container = screen.getByTestId('desktop-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('h-screen', 'w-screen', 'overflow-hidden');
  });

  it('renders video background when backgroundType is video', async () => {
    const videoSrc = '/test-video.mp4';
    render(Desktop, {
      props: {
        backgroundType: 'video',
        backgroundSource: videoSrc
      }
    });

    const video = screen.getByTestId('background-video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', videoSrc);
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveProperty('muted', true);
  });

  it('renders color background when backgroundType is color', async () => {
    const backgroundColor = '#ff0000';
    render(Desktop, {
      props: {
        backgroundType: 'color',
        backgroundColor
      }
    });

    const container = screen.getByTestId('desktop-container');
    expect(container).toHaveStyle(`background-color: ${backgroundColor}`);
  });

  it('falls back to default background when video fails to load', async () => {
    const videoSrc = '/invalid-video.mp4';
    render(Desktop, {
      props: {
        backgroundType: 'video',
        backgroundSource: videoSrc,
        fallbackBackground: '#0a0a0a'
      }
    });

    const video = screen.getByTestId('background-video');
    const container = screen.getByTestId('desktop-container');

    // Simulate video load error
    video.dispatchEvent(new Event('error'));

    expect(container).toHaveStyle('background-color: #0a0a0a');
  });

  it('applies cyberpunk theme classes', async () => {
    render(Desktop, {
      props: {
        backgroundType: 'color',
        backgroundColor: '#0a0a0a'
      }
    });

    const container = screen.getByTestId('desktop-container');
    expect(container).toHaveClass('bg-cyber-dark');
  });

  it('supports GPU acceleration for performance', async () => {
    render(Desktop, {
      props: {
        backgroundType: 'video',
        backgroundSource: '/test-video.mp4'
      }
    });

    const video = screen.getByTestId('background-video');
    expect(video).toHaveStyle('will-change: transform');
  });
});