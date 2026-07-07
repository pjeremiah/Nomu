import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../constants/app_constants.dart';
import '../theme/nomu_app_theme.dart';
import '../utils/logger.dart';

/// Self-contained QR camera preview. Remount or call [forceRestart] after
/// orientation changes or when the native camera enters an error state.
class BaristaCameraScanner extends StatefulWidget {
  const BaristaCameraScanner({
    super.key,
    required this.sessionToken,
    required this.onDetect,
    this.fit = BoxFit.cover,
  });

  /// Bump this value to fully dispose and recreate the native camera session.
  final int sessionToken;
  final void Function(BarcodeCapture capture) onDetect;
  final BoxFit fit;

  @override
  State<BaristaCameraScanner> createState() => BaristaCameraScannerState();
}

class BaristaCameraScannerState extends State<BaristaCameraScanner>
    with WidgetsBindingObserver {
  MobileScannerController? _controller;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_bootCamera());
  }

  @override
  void didUpdateWidget(covariant BaristaCameraScanner oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.sessionToken != widget.sessionToken) {
      unawaited(_bootCamera());
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) unawaited(ensureRunning());
      });
    }
  }

  /// Soft restart — start if stopped, full reboot if the controller reported an error.
  Future<void> ensureRunning() async {
    final c = _controller;
    if (!mounted || c == null || _busy) return;

    if (c.value.error != null) {
      await forceRestart();
      return;
    }

    if (c.value.isRunning) return;

    _busy = true;
    try {
      await c.start();
      Logger.debug('Camera started (ensureRunning)', 'SCANNER');
    } catch (e) {
      Logger.warning('Camera start failed, rebooting: $e', 'SCANNER');
      await forceRestart();
    } finally {
      _busy = false;
      if (mounted) setState(() {});
    }
  }

  /// Hard restart — dispose native camera and create a fresh controller.
  Future<void> forceRestart() async {
    if (_busy) return;
    _busy = true;
    try {
      await _bootCamera();
    } finally {
      _busy = false;
    }
  }

  Future<void> _bootCamera() async {
    await _tearDownCamera();

    if (!mounted) return;

    final controller = MobileScannerController(
      autoStart: false,
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
      detectionTimeoutMs: AppConstants.scannerDetectionTimeoutMs,
    );

    if (!mounted) {
      await controller.dispose();
      return;
    }

    setState(() => _controller = controller);

    // Wait for [MobileScanner] to mount with the new controller, then start.
    await Future<void>.delayed(const Duration(milliseconds: 120));
    if (!mounted || _controller != controller) {
      await controller.dispose();
      return;
    }

    try {
      await controller.start();
      Logger.debug('Camera booted successfully', 'SCANNER');
    } catch (e) {
      Logger.error('Camera boot failed: $e', 'SCANNER');
    }

    if (mounted) setState(() {});
  }

  Future<void> _tearDownCamera() async {
    final old = _controller;
    _controller = null;
    if (mounted) setState(() {});

    if (old != null) {
      try {
        await old.stop();
      } catch (_) {}
      try {
        await old.dispose();
      } catch (_) {}
    }

    // Give Android time to release the camera device before reopening.
    await Future<void>.delayed(const Duration(milliseconds: 400));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    final c = _controller;
    _controller = null;
    c?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (controller == null) {
      return const ColoredBox(
        color: Colors.black,
        child: Center(
          child: CircularProgressIndicator(color: Colors.white),
        ),
      );
    }

    return MobileScanner(
      controller: controller,
      fit: widget.fit,
      onDetect: widget.onDetect,
      errorBuilder: (context, error, child) {
        Logger.error('MobileScanner error: $error', 'SCANNER');
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Camera unavailable.\nTap below to restart the scanner.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.9),
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: _busy ? null : () => unawaited(forceRestart()),
                  style: NomuAppTheme.modalConfirmOutlineStyle,
                  child: const Text('Restart Camera'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
