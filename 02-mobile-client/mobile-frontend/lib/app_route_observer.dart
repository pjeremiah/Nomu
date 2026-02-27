import 'package:flutter/material.dart';

/// Shared route observer so pages can react when they become visible again (e.g. after pop).
final RouteObserver<PageRoute<dynamic>> appRouteObserver = RouteObserver<PageRoute<dynamic>>();
