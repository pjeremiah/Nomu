import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

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

/// Opens the branch location in Google Maps with the store name (latest Google Maps).
Future<void> _openInGoogleMaps(BuildContext context, Branch branch) async {
  final lat = branch.location.latitude;
  final lng = branch.location.longitude;
  // Show store name in search so the map displays the name, not raw coordinates
  final query = '${Uri.encodeComponent(branch.name)} $lat,$lng';
  final url = Uri.parse(
    'https://www.google.com/maps/search/?api=1&query=$query',
  );
  if (await canLaunchUrl(url)) {
    await launchUrl(url, mode: LaunchMode.externalApplication);
  } else {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not open Google Maps. Please install the app or try again.'),
        ),
      );
    }
  }
}

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
        // Visit Store button with fixed width (not wide) — opens Google Maps
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
              onPressed: () => _openInGoogleMaps(context, branch),
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