<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use App\Services\AdminAuditService;
use Exception;
use PDO;

final class AdminCategoryController
{
    /**
     * Lists categories with subcategories for admin CRUD screens.
     */
    public function index(Request $request, array $params = []): void
    {
        try {
            $pdo = Database::getConnection();

            $sql = "SELECT c.id AS category_id, c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon,
                           s.id AS subcategory_id, s.name AS subcategory_name, s.slug AS subcategory_slug
                    FROM categories c
                    LEFT JOIN subcategories s ON s.category_id = c.id
                    ORDER BY c.name ASC, s.name ASC";

            $stmt = $pdo->query($sql);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $out = [];
            foreach ($rows as $row) {
                $cid = (int) $row['category_id'];
                if (!isset($out[$cid])) {
                    $out[$cid] = [
                        'id' => $cid,
                        'name' => $row['category_name'],
                        'slug' => $row['category_slug'],
                        'icon' => $row['category_icon'],
                        'subcategories' => [],
                    ];
                }

                if ($row['subcategory_id'] !== null) {
                    $out[$cid]['subcategories'][] = [
                        'id' => (int) $row['subcategory_id'],
                        'name' => $row['subcategory_name'],
                        'slug' => $row['subcategory_slug'],
                    ];
                }
            }

            Json::success(array_values($out));
        } catch (Exception $e) {
            Logger::error('Admin categories list failed: ' . $e->getMessage());
            Json::error('Failed to fetch categories', 500);
        }
    }

    /**
     * Creates a category.
     */
    public function store(Request $request, array $params = []): void
    {
        $adminId = AuthMiddleware::authenticatedUserId($request);
        $data = $request->jsonBody();
        $name = trim((string) ($data['name'] ?? ''));
        $icon = trim((string) ($data['icon'] ?? ''));
        $slug = trim((string) ($data['slug'] ?? $this->slugify($name)));

        if ($name === '' || $icon === '' || $slug === '') {
            Json::error('Missing required fields', 400);
        }

        $pdo = Database::getConnection();

        try {
            $stmt = $pdo->prepare('INSERT INTO categories (name, icon, slug) VALUES (:name, :icon, :slug) RETURNING id');
            $stmt->execute([
                ':name' => $name,
                ':icon' => $icon,
                ':slug' => $slug,
            ]);
            $id = (int) $stmt->fetchColumn();

            (new AdminAuditService())->log($pdo, $adminId, 'category.create', 'category', $id, ['name' => $name, 'slug' => $slug]);
            Json::success(['id' => $id], 201);
        } catch (Exception $e) {
            Logger::error('Admin category create failed: ' . $e->getMessage());
            Json::error('Failed to create category', 500);
        }
    }

    /**
     * Updates a category.
     */
    public function update(Request $request, array $params = []): void
    {
        $id = (int) ($params['id'] ?? 0);
        $adminId = AuthMiddleware::authenticatedUserId($request);
        if ($id <= 0) {
            Json::error('Invalid category id', 400);
        }

        $data = $request->jsonBody();
        $name = trim((string) ($data['name'] ?? ''));
        $icon = trim((string) ($data['icon'] ?? ''));
        $slug = trim((string) ($data['slug'] ?? $this->slugify($name)));

        if ($name === '' || $icon === '' || $slug === '') {
            Json::error('Missing required fields', 400);
        }

        $pdo = Database::getConnection();

        try {
            $stmt = $pdo->prepare('UPDATE categories SET name=:name, icon=:icon, slug=:slug WHERE id=:id');
            $stmt->execute([
                ':id' => $id,
                ':name' => $name,
                ':icon' => $icon,
                ':slug' => $slug,
            ]);

            if ($stmt->rowCount() === 0) {
                Json::error('Category not found', 404);
            }

            (new AdminAuditService())->log($pdo, $adminId, 'category.update', 'category', $id, ['name' => $name, 'slug' => $slug]);
            Json::success(['id' => $id]);
        } catch (Exception $e) {
            Logger::error('Admin category update failed: ' . $e->getMessage());
            Json::error('Failed to update category', 500);
        }
    }

    /**
     * Deletes a category.
     */
    public function destroy(Request $request, array $params = []): void
    {
        $id = (int) ($params['id'] ?? 0);
        $adminId = AuthMiddleware::authenticatedUserId($request);
        if ($id <= 0) {
            Json::error('Invalid category id', 400);
        }

        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare('DELETE FROM categories WHERE id = :id');
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() === 0) {
                Json::error('Category not found', 404);
            }

            (new AdminAuditService())->log($pdo, $adminId, 'category.delete', 'category', $id, null);
            Json::success(['id' => $id]);
        } catch (Exception $e) {
            Logger::error('Admin category delete failed: ' . $e->getMessage());
            Json::error('Failed to delete category', 500);
        }
    }

    /**
     * Creates a subcategory.
     */
    public function storeSubcategory(Request $request, array $params = []): void
    {
        $adminId = AuthMiddleware::authenticatedUserId($request);
        $data = $request->jsonBody();
        $categoryId = (int) ($data['categoryId'] ?? 0);
        $name = trim((string) ($data['name'] ?? ''));
        $slug = trim((string) ($data['slug'] ?? $this->slugify($name)));

        if ($categoryId <= 0 || $name === '' || $slug === '') {
            Json::error('Missing required fields', 400);
        }

        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare('INSERT INTO subcategories (category_id, name, slug) VALUES (:category_id, :name, :slug) RETURNING id');
            $stmt->execute([
                ':category_id' => $categoryId,
                ':name' => $name,
                ':slug' => $slug,
            ]);

            $id = (int) $stmt->fetchColumn();
            (new AdminAuditService())->log($pdo, $adminId, 'subcategory.create', 'category', $id, ['category_id' => $categoryId]);
            Json::success(['id' => $id], 201);
        } catch (Exception $e) {
            Logger::error('Admin subcategory create failed: ' . $e->getMessage());
            Json::error('Failed to create subcategory', 500);
        }
    }

    /**
     * Updates a subcategory.
     */
    public function updateSubcategory(Request $request, array $params = []): void
    {
        $id = (int) ($params['id'] ?? 0);
        $adminId = AuthMiddleware::authenticatedUserId($request);
        if ($id <= 0) {
            Json::error('Invalid subcategory id', 400);
        }

        $data = $request->jsonBody();
        $name = trim((string) ($data['name'] ?? ''));
        $slug = trim((string) ($data['slug'] ?? $this->slugify($name)));
        if ($name === '' || $slug === '') {
            Json::error('Missing required fields', 400);
        }

        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare('UPDATE subcategories SET name=:name, slug=:slug WHERE id=:id');
            $stmt->execute([
                ':id' => $id,
                ':name' => $name,
                ':slug' => $slug,
            ]);

            if ($stmt->rowCount() === 0) {
                Json::error('Subcategory not found', 404);
            }

            (new AdminAuditService())->log($pdo, $adminId, 'subcategory.update', 'category', $id, ['slug' => $slug]);
            Json::success(['id' => $id]);
        } catch (Exception $e) {
            Logger::error('Admin subcategory update failed: ' . $e->getMessage());
            Json::error('Failed to update subcategory', 500);
        }
    }

    /**
     * Deletes a subcategory.
     */
    public function destroySubcategory(Request $request, array $params = []): void
    {
        $id = (int) ($params['id'] ?? 0);
        $adminId = AuthMiddleware::authenticatedUserId($request);
        if ($id <= 0) {
            Json::error('Invalid subcategory id', 400);
        }

        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare('DELETE FROM subcategories WHERE id=:id');
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() === 0) {
                Json::error('Subcategory not found', 404);
            }

            (new AdminAuditService())->log($pdo, $adminId, 'subcategory.delete', 'category', $id, null);
            Json::success(['id' => $id]);
        } catch (Exception $e) {
            Logger::error('Admin subcategory delete failed: ' . $e->getMessage());
            Json::error('Failed to delete subcategory', 500);
        }
    }

    /**
     * Creates URL-safe slug from a label.
     */
    private function slugify(string $value): string
    {
        $slug = strtolower($value);
        $slug = preg_replace('/[^a-z0-9]+/i', '-', $slug) ?? '';
        $slug = trim($slug, '-');

        return $slug === '' ? 'item' : $slug;
    }
}
