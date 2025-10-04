import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

void main() {
  runApp(const MaterialApp(
    debugShowCheckedModeBanner: false,
    home: MapPage(),
  ));
}

class Branch {
  final String name;
  final String imageAsset;
  final LatLng location;
  final String markerText;

  Branch({
    required this.name,
    required this.imageAsset,
    required this.location,
    required this.markerText,
  });
}

final List<Branch> branches = [
  Branch(
    name: "Nomu Cafe UST Dapitan",
    imageAsset: "assets/images/dapitan.jpg",
    location: const LatLng(14.6132289, 120.9897001),
    markerText: "Near UST Dapitan Gate",
  ),
  Branch(
    name: "Nomu Cafe UPD",
    imageAsset: "assets/images/upd.png",
    location: const LatLng(14.6582699, 121.0646193),
    markerText: "Inside UP Diliman Campus",
  ),
  Branch(
    name: "Nomu Cafe Jupiter",
    imageAsset: "assets/images/jupi.png",
    location: const LatLng(14.5629621, 121.022699),
    markerText: "Makati Area",
  ),
];

class MapPage extends StatelessWidget {
  const MapPage({super.key});

  Widget storeCard(BuildContext context, Branch branch) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.asset(
            branch.imageAsset,
            height: 250,
            width: double.infinity,
            fit: BoxFit.cover,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          branch.name,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
        ),
        const SizedBox(height: 5),
        // Visit Store button with fixed width (not wide)
        Align(
          alignment: Alignment.center,
          child: Container(
            width: 160, // Set a fixed width for the button
            height: 48,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              image: const DecorationImage(
                image: AssetImage('assets/images/istetik.png'),
                fit: BoxFit.cover,
              ),
            ),
            child: ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => MapScreen(
                      title: branch.name,
                      location: branch.location,
                      markerText: branch.markerText,
                      titleColor: Colors.white,
                    ),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                elevation: 0,
              ),
              child: const Text(
                "Visit Store",
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: branches.length,
          itemBuilder: (context, index) => storeCard(context, branches[index]),
        ),
      ),
    );
  }
}

class MapScreen extends StatelessWidget {
  final String title;
  final LatLng location;
  final String markerText;
  final Color titleColor;

  const MapScreen({
    super.key,
    required this.title,
    required this.location,
    required this.markerText,
    this.titleColor = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          title,
          style: TextStyle(color: titleColor),
        ),
        iconTheme: IconThemeData(color: titleColor),
        backgroundColor: const Color(0xFF242C5B),
      ),
      body: FlutterMap(
        options: MapOptions(center: location, zoom: 17),
        children: [
          TileLayer(
            urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            subdomains: const ['a', 'b', 'c'],
            userAgentPackageName: 'com.example.nomu',
          ),
          MarkerLayer(
            markers: [
              Marker(
                point: location,
                width: 80,
                height: 80,
                child: const Icon(
                  Icons.location_pin,
                  size: 40,
                  color: Colors.red,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}