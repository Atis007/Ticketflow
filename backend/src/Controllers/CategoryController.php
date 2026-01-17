<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Helpers\Json;
use App\Core\Logger;
use PDO;

final class CategoryController
{
    public function index(Request $request, array $params = []): void
    {
        try {
            $pdo = Database::getConnection();

            $sql = "SELECT c.id AS category_id, 
                       c.name AS category_name,
                       c.slug AS category_slug, 
                       c.icon AS category_icon,
                       
                       s.id AS subcategory_id,
                       s.name AS subcategory_name,
                       s.slug AS subcategory_slug
                       FROM categories c
                       LEFT JOIN subcategories s ON c.id = s.category_id
                       ORDER BY c.name ASC, s.name ASC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $categories = [];
            foreach ($rows as $row) {
                $catId = $row['category_id'];

                if (!isset($categories[$catId])) {
                    $categories[$catId] = [
                        'id' => $catId,
                        'name' => $row['category_name'],
                        'slug' => $row['category_slug'],
                        'icon' => $row['category_icon'],
                        'subcategories' => []
                    ];
                }

                if ($row['subcategory_id']) {
                    $categories[$catId]['subcategories'][] = [
                        'id' => $row['subcategory_id'],
                        'name' => $row['subcategory_name'],
                        'slug' => $row['subcategory_slug']
                    ];
                }
            }

            Json::success(array_values($categories));
        } catch (\Throwable $e) {
            Json::error('Internal server error', 500);
        }
    }
}
