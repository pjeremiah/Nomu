import 'package:flutter/material.dart';
import '../models/menu_item.dart';
import 'gridfs_image_widget.dart';

class MenuItemCard extends StatelessWidget {
  final MenuItem menuItem;
  final VoidCallback? onTap;
  final VoidCallback? onAddToCart;
  final bool showAddButton;
  final EdgeInsets? margin;
  final BorderRadius? borderRadius;

  const MenuItemCard({
    Key? key,
    required this.menuItem,
    this.onTap,
    this.onAddToCart,
    this.showAddButton = true,
    this.margin,
    this.borderRadius,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: margin ?? const EdgeInsets.all(8.0),
      shape: RoundedRectangleBorder(
        borderRadius: borderRadius ?? BorderRadius.circular(12),
      ),
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: borderRadius ?? BorderRadius.circular(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildImageSection(context),
            _buildContentSection(context),
            if (showAddButton) _buildActionSection(context),
          ],
        ),
      ),
    );
  }

  Widget _buildImageSection(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.only(
        topLeft: (borderRadius ?? BorderRadius.circular(12)).topLeft,
        topRight: (borderRadius ?? BorderRadius.circular(12)).topRight,
      ),
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: menuItem.hasImage
            ? GridFSImageWidget(
                imageType: 'menu',
                imageId: menuItem.imageId ?? '',
                fit: BoxFit.cover,
                placeholder: _buildPlaceholder(),
                errorWidget: _buildErrorWidget(),
              )
            : _buildPlaceholder(),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: Colors.grey[200],
      child: const Center(
        child: Icon(
          Icons.restaurant_menu,
          color: Colors.grey,
          size: 48,
        ),
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Container(
      color: Colors.grey[200],
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              color: Colors.red,
              size: 32,
            ),
            SizedBox(height: 4),
            Text(
              'Failed to load image',
              style: TextStyle(
                color: Colors.red,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContentSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  menuItem.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                '₱${menuItem.price.toStringAsFixed(0)}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.green,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          if (menuItem.description.isNotEmpty)
            Text(
              menuItem.description,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  menuItem.category,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.blue[700],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              if (menuItem.preparationTime > 0)
                Row(
                  children: [
                    Icon(
                      Icons.access_time,
                      size: 14,
                      color: Colors.grey[600],
                    ),
                    const SizedBox(width: 2),
                    Text(
                      '${menuItem.preparationTime} min',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
            ],
          ),
          if (menuItem.tags.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 4,
              runSpacing: 4,
              children: menuItem.tags.take(3).map((tag) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    tag,
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.grey[700],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActionSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              onPressed: onAddToCart,
              icon: const Icon(Icons.add_shopping_cart, size: 18),
              label: const Text('Add to Cart'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class MenuItemGrid extends StatelessWidget {
  final List<MenuItem> menuItems;
  final Function(MenuItem)? onItemTap;
  final Function(MenuItem)? onAddToCart;
  final bool showAddButton;
  final int crossAxisCount;
  final double childAspectRatio;
  final EdgeInsets? padding;

  const MenuItemGrid({
    Key? key,
    required this.menuItems,
    this.onItemTap,
    this.onAddToCart,
    this.showAddButton = true,
    this.crossAxisCount = 2,
    this.childAspectRatio = 0.75,
    this.padding,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: padding ?? const EdgeInsets.all(8.0),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: childAspectRatio,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: menuItems.length,
      itemBuilder: (context, index) {
        final menuItem = menuItems[index];
        return MenuItemCard(
          menuItem: menuItem,
          onTap: onItemTap != null ? () => onItemTap!(menuItem) : null,
          onAddToCart: onAddToCart != null ? () => onAddToCart!(menuItem) : null,
          showAddButton: showAddButton,
        );
      },
    );
  }
}

class MenuItemList extends StatelessWidget {
  final List<MenuItem> menuItems;
  final Function(MenuItem)? onItemTap;
  final Function(MenuItem)? onAddToCart;
  final bool showAddButton;
  final EdgeInsets? padding;

  const MenuItemList({
    Key? key,
    required this.menuItems,
    this.onItemTap,
    this.onAddToCart,
    this.showAddButton = true,
    this.padding,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: padding ?? const EdgeInsets.all(8.0),
      itemCount: menuItems.length,
      itemBuilder: (context, index) {
        final menuItem = menuItems[index];
        return MenuItemCard(
          menuItem: menuItem,
          onTap: onItemTap != null ? () => onItemTap!(menuItem) : null,
          onAddToCart: onAddToCart != null ? () => onAddToCart!(menuItem) : null,
          showAddButton: showAddButton,
        );
      },
    );
  }
}
