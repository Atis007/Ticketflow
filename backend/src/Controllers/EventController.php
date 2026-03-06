<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use App\Models\UserRole;
use App\Services\AdminAuditService;
use App\Services\EventChangeLogService;
use App\Services\EventSeatService;
use App\Services\ImageUploadService;
use DateTimeImmutable;
use Exception;
use PDO;
use PDOException;

final class EventController
{
    /**
     * Lists active events with optional filters.
     */
    public function index(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();

        $page = max(1, (int) ($request->query['page'] ?? 1));
        $pageSize = max(1, min(100, (int) ($request->query['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;

        $categoryFilter = trim((string) ($request->query['category'] ?? ''));
        $cityFilter = trim((string) ($request->query['city'] ?? ''));
        $monthFilter = trim((string) ($request->query['month'] ?? ''));

        $where = ['e.is_active = TRUE'];
        $bind = [];

        if ($categoryFilter !== '') {
            if (ctype_digit($categoryFilter)) {
                $where[] = 'e.category_id = :category_id';
                $bind[':category_id'] = (int) $categoryFilter;
            } else {
                $where[] = 'c.slug = :category_slug';
                $bind[':category_slug'] = $categoryFilter;
            }
        }

        if ($cityFilter !== '') {
            $where[] = 'e.city ILIKE :city';
            $bind[':city'] = '%' . $cityFilter . '%';
        }

        if ($monthFilter !== '') {
            if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $monthFilter)) {
                Json::error('Invalid month format. Use YYYY-MM.', 400);
            }

            $monthStart = DateTimeImmutable::createFromFormat('!Y-m-d', $monthFilter . '-01');
            if (!$monthStart instanceof DateTimeImmutable) {
                Json::error('Invalid month format. Use YYYY-MM.', 400);
            }

            $monthStart = $monthStart->setTime(0, 0, 0);
            $monthEnd = $monthStart->modify('+1 month');

            $where[] = 'e.starts_at >= :month_start AND e.starts_at < :month_end';
            $bind[':month_start'] = $monthStart->format('Y-m-d H:i:sP');
            $bind[':month_end'] = $monthEnd->format('Y-m-d H:i:sP');
        }

        $whereSql = 'WHERE ' . implode(' AND ', $where);
        $timezone = $this->appTimezone();

        try {
            $countStmt = $pdo->prepare(
                "SELECT COUNT(*)
                 FROM events e
                 INNER JOIN categories c ON c.id = e.category_id
                 INNER JOIN subcategories s ON s.id = e.subcategory_id
                 {$whereSql}"
            );

            foreach ($bind as $key => $value) {
                $type = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
                $countStmt->bindValue($key, $value, $type);
            }

            $countStmt->execute();
            $total = (int) $countStmt->fetchColumn();

            $stmt = $pdo->prepare(
                "SELECT
                    e.id,
                    e.slug,
                    e.title,
                    e.description,
                    e.image,
                    e.city,
                    e.venue,
                    TO_CHAR(timezone(:tz, e.starts_at), 'YYYY-MM-DD HH24:MI:SS') AS starts_at,
                    TO_CHAR(timezone(:tz, e.ends_at), 'YYYY-MM-DD HH24:MI:SS') AS ends_at,
                    e.capacity,
                    e.tickets_sold,
                    e.is_free,
                    e.price,
                    e.is_active,
                    e.is_seated,
                    e.created_by,
                    c.id AS category_id,
                    c.name AS category_name,
                    c.slug AS category_slug,
                    s.id AS subcategory_id,
                    s.name AS subcategory_name,
                    s.slug AS subcategory_slug
                 FROM events e
                 INNER JOIN categories c ON c.id = e.category_id
                 INNER JOIN subcategories s ON s.id = e.subcategory_id
                 {$whereSql}
                 ORDER BY e.starts_at ASC
                 LIMIT :limit OFFSET :offset"
            );

            $stmt->bindValue(':tz', $timezone, PDO::PARAM_STR);
            foreach ($bind as $key => $value) {
                $type = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
                $stmt->bindValue($key, $value, $type);
            }
            $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $payload = [
                'items' => $stmt->fetchAll(PDO::FETCH_ASSOC),
                'pagination' => [
                    'page' => $page,
                    'pageSize' => $pageSize,
                    'total' => $total,
                    'totalPages' => $pageSize > 0 ? (int) ceil($total / $pageSize) : 1,
                ],
            ];

            $this->respondNotModifiedIfEtagMatches($request, $payload);
            Json::success($payload);
        } catch (Exception $e) {
            Logger::error('Failed to list events: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Returns event detail by id.
     */
    public function show(Request $request, array $params = []): void
    {
        $id = (int) ($params['id'] ?? 0);
        if ($id <= 0) {
            Json::error('Invalid event id', 400);
        }

        try {
            $pdo = Database::getConnection();
            $timezone = $this->appTimezone();

            $stmt = $pdo->prepare(
                "SELECT
                    e.id,
                    e.slug,
                    e.title,
                    e.description,
                    e.image,
                    e.city,
                    e.venue,
                    TO_CHAR(timezone(:tz, e.starts_at), 'YYYY-MM-DD HH24:MI:SS') AS starts_at,
                    TO_CHAR(timezone(:tz, e.ends_at), 'YYYY-MM-DD HH24:MI:SS') AS ends_at,
                    e.capacity,
                    e.tickets_sold,
                    e.is_free,
                    e.price,
                    e.is_active,
                    e.is_seated,
                    e.created_by,
                    c.id AS category_id,
                    c.name AS category_name,
                    c.slug AS category_slug,
                    s.id AS subcategory_id,
                    s.name AS subcategory_name,
                    s.slug AS subcategory_slug
                 FROM events e
                 INNER JOIN categories c ON c.id = e.category_id
                 INNER JOIN subcategories s ON s.id = e.subcategory_id
                 WHERE e.id = :id
                   AND e.is_active = TRUE
                 LIMIT 1"
            );

            $stmt->bindValue(':tz', $timezone, PDO::PARAM_STR);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            $event = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!is_array($event)) {
                Json::error('Event not found', 404);
            }

            Json::success(['event' => $event]);
        } catch (Exception $e) {
            Logger::error('Failed to fetch event by id: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Creates an event owned by authenticated user.
     */
    public function store(Request $request, array $params = []): void
    {
        $payload = AuthMiddleware::authenticatedPayload($request);
        $ownerId = (int) ($payload['id'] ?? 0);

        if ($ownerId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $data = $this->resolvePayload($request);
        $uploadedImage = $this->uploadEventImageIfPresent();
        if ($uploadedImage !== null) {
            $data['image'] = $uploadedImage;
        }
        $actorRole = $payload['role'] ?? null;

        $title = trim((string) ($data['title'] ?? ''));
        $slug = trim((string) ($data['slug'] ?? $this->slugify($title)));
        $categoryId = (int) ($data['categoryId'] ?? 0);
        $subcategoryId = (int) ($data['subcategoryId'] ?? 0);
        $startsAt = trim((string) ($data['startsAt'] ?? ''));
        $endsAt = trim((string) ($data['endsAt'] ?? ''));

        if ($title === '' || $slug === '' || $categoryId <= 0 || $subcategoryId <= 0 || $startsAt === '') {
            Json::error('Missing required fields', 400);
        }

        $description = $this->nullableString($data['description'] ?? null);
        $image = $this->nullableString($data['image'] ?? null);
        $city = $this->nullableString($data['city'] ?? null);
        $venue = $this->nullableString($data['venue'] ?? null);
        $capacity = $this->nullablePositiveInt($data['capacity'] ?? null, 'capacity');
        $isFree = $this->toBool($data['isFree'] ?? false, 'isFree');
        $price = $this->nullableFloat($data['price'] ?? null, 'price');
        $isSeated = $this->toBool($data['isSeated'] ?? false, 'isSeated');
        $isActive = array_key_exists('isActive', $data) ? $this->toBool($data['isActive'], 'isActive') : true;
        $startsAtValue = $this->parseDateTimeOrError($startsAt, 'startsAt');
        $endsAtValue = $endsAt === '' ? null : $this->parseDateTimeOrError($endsAt, 'endsAt');
        $this->assertDateOrder($startsAtValue, $endsAtValue);
        $this->assertFreePaidConsistency($isFree, $price);

        try {
            $pdo = Database::getConnection();

            $this->assertCategorySubcategoryPair($pdo, $categoryId, $subcategoryId);
            $this->assertUniqueTitleOnCreate($pdo, $title);

            $pdo->beginTransaction();

            $stmt = $pdo->prepare(
                'INSERT INTO events
                    (created_by, category_id, subcategory_id, title, slug, description, image, city, venue, starts_at, ends_at, capacity, is_free, price, is_active, is_seated)
                 VALUES
                    (:created_by, :category_id, :subcategory_id, :title, :slug, :description, :image, :city, :venue, :starts_at, :ends_at, :capacity, :is_free, :price, :is_active, :is_seated)
                 RETURNING id'
            );

            $stmt->bindValue(':created_by', $ownerId, PDO::PARAM_INT);
            $stmt->bindValue(':category_id', $categoryId, PDO::PARAM_INT);
            $stmt->bindValue(':subcategory_id', $subcategoryId, PDO::PARAM_INT);
            $stmt->bindValue(':title', $title, PDO::PARAM_STR);
            $stmt->bindValue(':slug', $slug, PDO::PARAM_STR);
            $stmt->bindValue(':description', $description, $description === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->bindValue(':image', $image, $image === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->bindValue(':city', $city, $city === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->bindValue(':venue', $venue, $venue === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->bindValue(':starts_at', $startsAtValue->format('Y-m-d H:i:sP'), PDO::PARAM_STR);
            $stmt->bindValue(':ends_at', $endsAtValue?->format('Y-m-d H:i:sP'), $endsAtValue === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->bindValue(':capacity', $capacity, $capacity === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $stmt->bindValue(':is_free', $isFree, PDO::PARAM_BOOL);
            $stmt->bindValue(':price', $price, $price === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->bindValue(':is_active', $isActive, PDO::PARAM_BOOL);
            $stmt->bindValue(':is_seated', $isSeated, PDO::PARAM_BOOL);
            $stmt->execute();

            $eventId = (int) $stmt->fetchColumn();

            if ($isSeated && $capacity !== null && $capacity > 0) {
                (new EventSeatService())->generateSeats($pdo, $eventId, $capacity);
            }

            $pdo->commit();

            if ($actorRole instanceof UserRole && $actorRole === UserRole::ADMIN) {
                (new AdminAuditService())->log(
                    $pdo,
                    $ownerId,
                    'event.create',
                    'event',
                    $eventId,
                    [
                        'title' => $title,
                        'slug' => $slug,
                        'category_id' => $categoryId,
                        'subcategory_id' => $subcategoryId,
                    ]
                );
            }

            Json::success([
                'id' => $eventId,
                'message' => 'Event created successfully',
            ], 201);
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->handleEventWritePdoException($e);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            Logger::error('Failed to create event: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Updates an existing event (owner or admin).
     */
    public function update(Request $request, array $params = []): void
    {
        $id = (int) ($params['id'] ?? 0);
        if ($id <= 0) {
            Json::error('Invalid event id', 400);
        }

        $payload = AuthMiddleware::authenticatedPayload($request);
        $actorId = (int) ($payload['id'] ?? 0);
        $actorRole = $payload['role'] ?? null;

        if ($actorId <= 0) {
            Json::error('Unauthorized', 401);
        }

        try {
            $pdo = Database::getConnection();

            $ownerStmt = $pdo->prepare(
                'SELECT id, created_by, category_id, subcategory_id, title, slug, description, image, city, venue,
                        starts_at, ends_at, capacity, is_free, price, is_active, is_seated
                 FROM events
                 WHERE id = :id
                 LIMIT 1'
            );
            $ownerStmt->bindValue(':id', $id, PDO::PARAM_INT);
            $ownerStmt->execute();
            $existing = $ownerStmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($existing)) {
                Json::error('Event not found', 404);
            }

            $isAdmin = $actorRole instanceof UserRole && $actorRole === UserRole::ADMIN;
            $isOwner = (int) ($existing['created_by'] ?? 0) === $actorId;

            if (!$isAdmin && !$isOwner) {
                Json::error('Forbidden', 403);
            }

            $data = $this->resolvePayload($request);
            $uploadedImage = $this->uploadEventImageIfPresent();
            if ($uploadedImage !== null) {
                $data['image'] = $uploadedImage;
            }
            $isPut = strtoupper($request->method) === 'PUT';

            $allowed = [
                'categoryId' => 'category_id',
                'subcategoryId' => 'subcategory_id',
                'title' => 'title',
                'slug' => 'slug',
                'description' => 'description',
                'image' => 'image',
                'city' => 'city',
                'venue' => 'venue',
                'startsAt' => 'starts_at',
                'endsAt' => 'ends_at',
                'capacity' => 'capacity',
                'isFree' => 'is_free',
                'price' => 'price',
                'isActive' => 'is_active',
                'isSeated' => 'is_seated',
            ];

            if ($isPut) {
                $required = ['title', 'categoryId', 'subcategoryId', 'startsAt'];
                foreach ($required as $requiredField) {
                    if (!array_key_exists($requiredField, $data)) {
                        Json::error('Missing required fields for PUT update', 400);
                    }
                }
            }

            if (array_key_exists('title', $data)) {
                $titleCandidate = trim((string) $data['title']);
                if ($titleCandidate === '') {
                    Json::error('title cannot be empty', 400);
                }

                $this->assertUniqueTitleOnUpdate($pdo, $titleCandidate, $id);
            }

            $targetCategoryId = array_key_exists('categoryId', $data)
                ? (int) $data['categoryId']
                : (int) ($existing['category_id'] ?? 0);

            $targetSubcategoryId = array_key_exists('subcategoryId', $data)
                ? (int) $data['subcategoryId']
                : (int) ($existing['subcategory_id'] ?? 0);

            $this->assertCategorySubcategoryPair($pdo, $targetCategoryId, $targetSubcategoryId);

            $currentStartsAt = $this->parseDateTimeOrError((string) ($existing['starts_at'] ?? ''), 'startsAt');
            $targetStartsAt = $currentStartsAt;
            if (array_key_exists('startsAt', $data)) {
                $startsAtRaw = trim((string) $data['startsAt']);
                $targetStartsAt = $this->parseDateTimeOrError($startsAtRaw, 'startsAt');
            }

            $currentEndsRaw = $existing['ends_at'] ?? null;
            $targetEndsAt = $currentEndsRaw === null
                ? null
                : $this->parseDateTimeOrError((string) $currentEndsRaw, 'endsAt');

            if (array_key_exists('endsAt', $data)) {
                $endsAtRaw = $data['endsAt'];
                if ($endsAtRaw === null || trim((string) $endsAtRaw) === '') {
                    $targetEndsAt = null;
                } else {
                    $targetEndsAt = $this->parseDateTimeOrError((string) $endsAtRaw, 'endsAt');
                }
            }

            $this->assertDateOrder($targetStartsAt, $targetEndsAt);

            $targetIsFree = array_key_exists('isFree', $data)
                ? $this->toBool($data['isFree'], 'isFree')
                : (bool) ($existing['is_free'] ?? false);

            $targetPrice = array_key_exists('price', $data)
                ? $this->nullableFloat($data['price'], 'price')
                : (($existing['price'] ?? null) === null ? null : (float) $existing['price']);

            $this->assertFreePaidConsistency($targetIsFree, $targetPrice);

            if (array_key_exists('capacity', $data)) {
                $this->nullablePositiveInt($data['capacity'], 'capacity');
            }

            $setParts = [];
            $bind = [':id' => $id];

            foreach ($allowed as $inputKey => $column) {
                if (!array_key_exists($inputKey, $data)) {
                    continue;
                }

                $param = ':' . $column;
                $setParts[] = $column . ' = ' . $param;

                if (in_array($inputKey, ['categoryId', 'subcategoryId', 'capacity'], true)) {
                    $bind[$param] = $data[$inputKey] === null ? null : (int) $data[$inputKey];
                    continue;
                }

                if (in_array($inputKey, ['isFree', 'isActive', 'isSeated'], true)) {
                    $bind[$param] = $this->toBool($data[$inputKey], $inputKey);
                    continue;
                }

                if ($inputKey === 'price') {
                    $bind[$param] = $this->nullableFloat($data[$inputKey], 'price');
                    continue;
                }

                if ($inputKey === 'startsAt') {
                    $bind[$param] = $targetStartsAt->format('Y-m-d H:i:sP');
                    continue;
                }

                if ($inputKey === 'endsAt') {
                    $bind[$param] = $targetEndsAt?->format('Y-m-d H:i:sP');
                    continue;
                }

                if ($inputKey === 'capacity') {
                    $bind[$param] = $this->nullablePositiveInt($data[$inputKey], 'capacity');
                    continue;
                }

                $bind[$param] = $data[$inputKey] === null ? null : trim((string) $data[$inputKey]);
            }

            if ($setParts === []) {
                Json::error('No fields provided for update', 400);
            }

            $sql = 'UPDATE events SET ' . implode(', ', $setParts) . ' WHERE id = :id';
            $stmt = $pdo->prepare($sql);

            foreach ($bind as $param => $value) {
                $type = PDO::PARAM_STR;
                if (is_int($value)) {
                    $type = PDO::PARAM_INT;
                } elseif (is_bool($value)) {
                    $type = PDO::PARAM_BOOL;
                } elseif ($value === null) {
                    $type = PDO::PARAM_NULL;
                }

                $stmt->bindValue($param, $value, $type);
            }

            $stmt->execute();

            $afterStmt = $pdo->prepare(
                'SELECT category_id, subcategory_id, title, slug, description, image, city, venue,
                        starts_at, ends_at, capacity, is_free, price, is_active, is_seated
                 FROM events
                 WHERE id = :id
                 LIMIT 1'
            );
            $afterStmt->bindValue(':id', $id, PDO::PARAM_INT);
            $afterStmt->execute();
            $after = $afterStmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($after)) {
                Json::error('Event not found after update', 404);
            }

            $isNowSeated = (bool) ($after['is_seated'] ?? false);
            $wasSeated = (bool) ($existing['is_seated'] ?? false);
            $newCapacity = isset($after['capacity']) ? (int) $after['capacity'] : null;
            $oldCapacity = isset($existing['capacity']) ? (int) $existing['capacity'] : null;

            if ($isNowSeated && $newCapacity !== null && $newCapacity > 0 && (!$wasSeated || $newCapacity !== $oldCapacity)) {
                (new EventSeatService())->generateSeats($pdo, $id, $newCapacity);
            }

            $trackedFields = [
                'category_id',
                'subcategory_id',
                'title',
                'slug',
                'description',
                'image',
                'city',
                'venue',
                'starts_at',
                'ends_at',
                'capacity',
                'is_free',
                'price',
                'is_active',
                'is_seated',
            ];

            $changeLogService = new EventChangeLogService();
            $changeLogService->logDiff($pdo, $id, $actorId, $existing, $after, $trackedFields);

            if ($isAdmin) {
                (new AdminAuditService())->log(
                    $pdo,
                    $actorId,
                    'event.update',
                    'event',
                    $id,
                    [
                        'changed_fields' => $this->changedFields($existing, $after, $trackedFields),
                    ]
                );
            }

            Json::success([
                'id' => $id,
                'message' => 'Event updated successfully',
            ]);
        } catch (PDOException $e) {
            $this->handleEventWritePdoException($e);
        } catch (Exception $e) {
            Logger::error('Failed to update event: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Lists active events for a category or subcategory slug.
     */
    public function indexBySubcategory(Request $request, array $params = []): void
    {
        $scopeSlug = trim((string) (($params['category_slug'] ?? $params['subcategory_slug']) ?? ''));
        if ($scopeSlug === '') {
            Json::error('Category slug is required', 400);
        }

        $page = max(1, (int) ($request->query['page'] ?? 1));
        $pageSize = max(1, min(100, (int) ($request->query['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;
        $timezone = $this->appTimezone();

        try {
            $pdo = Database::getConnection();
            $countStmt = $pdo->prepare(
                "SELECT COUNT(*)
                 FROM events e
                 INNER JOIN subcategories s ON s.id = e.subcategory_id
                 INNER JOIN categories c ON c.id = e.category_id
                 WHERE (c.slug = :scope_slug OR s.slug = :scope_slug)
                   AND e.is_active = TRUE"
            );
            $countStmt->execute([':scope_slug' => $scopeSlug]);
            $total = (int) $countStmt->fetchColumn();

            $stmt = $pdo->prepare(
                "SELECT
                    e.id,
                    e.slug,
                    e.title,
                    e.image,
                    e.city,
                    e.venue,
                    TO_CHAR(timezone(:tz, e.starts_at), 'YYYY-MM-DD HH24:MI:SS') AS starts_at,
                    e.is_free,
                    e.price,
                    e.is_seated,
                    s.slug AS subcategory_slug,
                    c.slug AS category_slug,
                    c.name AS category_name,
                    s.name AS subcategory_name
                 FROM events e
                 INNER JOIN subcategories s ON s.id = e.subcategory_id
                 INNER JOIN categories c ON c.id = e.category_id
                 WHERE (c.slug = :scope_slug OR s.slug = :scope_slug)
                    AND e.is_active = TRUE
                 ORDER BY e.starts_at ASC
                 LIMIT :limit OFFSET :offset"
            );

            $stmt->bindValue(':tz', $timezone, PDO::PARAM_STR);
            $stmt->bindValue(':scope_slug', $scopeSlug, PDO::PARAM_STR);
            $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Json::success([
                'items' => $events,
                'pagination' => [
                    'page' => $page,
                    'pageSize' => $pageSize,
                    'total' => $total,
                    'totalPages' => $pageSize > 0 ? (int) ceil($total / $pageSize) : 1,
                ],
                'scopeSlug' => $scopeSlug,
            ]);
        } catch (Exception $e) {
            Logger::error('Failed to list events by scope slug: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Returns event detail by category/subcategory slug and event slug.
     */
    public function showBySubcategoryAndSlug(Request $request, array $params = []): void
    {
        $scopeSlug = trim((string) (($params['category_slug'] ?? $params['subcategory_slug']) ?? ''));
        $eventSlug = trim((string) ($params['event_slug'] ?? ''));

        if ($scopeSlug === '' || $eventSlug === '') {
            Json::error('Category slug and event slug are required', 400);
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare(
                "SELECT
                    e.id,
                    e.slug,
                    e.title,
                    e.description,
                    e.image,
                    e.city,
                    e.venue,
                    TO_CHAR(e.starts_at, 'YYYY.MM.DD HH24:MI:SS') AS starts_at,
                    TO_CHAR(e.ends_at, 'YYYY.MM.DD HH24:MI:SS') AS ends_at,
                    e.capacity,
                    e.tickets_sold,
                    e.is_free,
                    e.price,
                    e.is_seated,
                    e.created_by,
                    s.id AS subcategory_id,
                    s.name AS subcategory_name,
                    s.slug AS subcategory_slug,
                    c.id AS category_id,
                    c.name AS category_name,
                    c.slug AS category_slug
                 FROM events e
                 INNER JOIN subcategories s ON s.id = e.subcategory_id
                 INNER JOIN categories c ON c.id = e.category_id
                 WHERE (c.slug = :scope_slug OR s.slug = :scope_slug)
                    AND e.slug = :event_slug
                    AND e.is_active = TRUE
                 LIMIT 1"
            );

            $stmt->execute([
                ':scope_slug' => $scopeSlug,
                ':event_slug' => $eventSlug,
            ]);

            $event = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!is_array($event)) {
                Json::error('Event not found', 404);
            }

            Json::success(['event' => $event]);
        } catch (Exception $e) {
            Logger::error('Failed to fetch event detail by scope/event slug: ' . $e->getMessage());
            Json::error('Internal server error', 500);
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

        return $slug === '' ? 'event' : $slug;
    }

    private function appTimezone(): string
    {
        $value = (string) ($_ENV['TIMEZONE'] ?? 'UTC');
        $sanitized = preg_replace('/[^A-Za-z0-9_\/+-]/', '', $value) ?? 'UTC';

        return $sanitized !== '' ? $sanitized : 'UTC';
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $string = trim((string) $value);
        return $string === '' ? null : $string;
    }

    /**
     * @return array<string, mixed>
     */
    private function resolvePayload(Request $request): array
    {
        $json = $request->jsonBody();
        $form = $_POST ?? [];

        if (!is_array($form)) {
            $form = [];
        }

        return array_merge($json, $form);
    }

    private function uploadEventImageIfPresent(): ?string
    {
        if (!isset($_FILES['image'])) {
            return null;
        }

        $file = $_FILES['image'];
        if (!is_array($file)) {
            return null;
        }

        if ((int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        return (new ImageUploadService())->store($file, 'events', 'event');
    }

    private function toBool(mixed $value, string $field): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        $parsed = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($parsed === null) {
            Json::error('Invalid boolean value for ' . $field, 400);
        }

        return $parsed;
    }

    private function nullablePositiveInt(mixed $value, string $field): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_numeric($value)) {
            Json::error('Invalid numeric value for ' . $field, 400);
        }

        $intValue = (int) $value;
        if ($intValue <= 0) {
            Json::error($field . ' must be greater than 0', 400);
        }

        return $intValue;
    }

    private function nullableFloat(mixed $value, string $field): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_numeric($value)) {
            Json::error('Invalid numeric value for ' . $field, 400);
        }

        return (float) $value;
    }

    private function parseDateTimeOrError(string $value, string $field): DateTimeImmutable
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            Json::error($field . ' is required', 400);
        }

        try {
            return new DateTimeImmutable($trimmed);
        } catch (Exception) {
            Json::error('Invalid datetime format for ' . $field, 400);
        }
    }

    private function assertDateOrder(DateTimeImmutable $startsAt, ?DateTimeImmutable $endsAt): void
    {
        if ($endsAt !== null && $endsAt < $startsAt) {
            Json::error('endsAt must be greater than or equal to startsAt', 400);
        }
    }

    private function assertFreePaidConsistency(bool $isFree, ?float $price): void
    {
        if ($isFree && $price !== null && $price > 0) {
            Json::error('Free events cannot have a positive price', 400);
        }

        if (!$isFree && ($price === null || $price <= 0)) {
            Json::error('Paid events must have a price greater than 0', 400);
        }
    }

    private function assertCategorySubcategoryPair(PDO $pdo, int $categoryId, int $subcategoryId): void
    {
        if ($categoryId <= 0 || $subcategoryId <= 0) {
            Json::error('Invalid category or subcategory', 400);
        }

        $stmt = $pdo->prepare(
            'SELECT id
             FROM subcategories
             WHERE id = :subcategory_id
               AND category_id = :category_id
             LIMIT 1'
        );
        $stmt->bindValue(':subcategory_id', $subcategoryId, PDO::PARAM_INT);
        $stmt->bindValue(':category_id', $categoryId, PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->fetchColumn() === false) {
            Json::error('Subcategory does not belong to the selected category', 400);
        }
    }

    private function assertUniqueTitleOnCreate(PDO $pdo, string $title): void
    {
        $stmt = $pdo->prepare('SELECT id FROM events WHERE title = :title LIMIT 1');
        $stmt->bindValue(':title', $title, PDO::PARAM_STR);
        $stmt->execute();

        if ($stmt->fetchColumn() !== false) {
            Json::error('Warning: an event with this exact title already exists. Please use a different title.', 409);
        }
    }

    private function assertUniqueTitleOnUpdate(PDO $pdo, string $title, int $eventId): void
    {
        $stmt = $pdo->prepare('SELECT id FROM events WHERE title = :title AND id <> :event_id LIMIT 1');
        $stmt->bindValue(':title', $title, PDO::PARAM_STR);
        $stmt->bindValue(':event_id', $eventId, PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->fetchColumn() !== false) {
            Json::error('Warning: an event with this exact title already exists. Please use a different title.', 409);
        }
    }

    /**
     * @param array<string, mixed> $before
     * @param array<string, mixed> $after
     * @param string[] $fields
     *
     * @return string[]
     */
    private function changedFields(array $before, array $after, array $fields): array
    {
        $changed = [];
        foreach ($fields as $field) {
            $oldValue = $before[$field] ?? null;
            $newValue = $after[$field] ?? null;

            if ($this->normalizeForChangeCompare($oldValue) === $this->normalizeForChangeCompare($newValue)) {
                continue;
            }

            $changed[] = $field;
        }

        return $changed;
    }

    private function normalizeForChangeCompare(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if ($value === null) {
            return '';
        }

        return trim((string) $value);
    }

    private function handleEventWritePdoException(PDOException $e): void
    {
        $sqlState = (string) $e->getCode();
        $message = $e->getMessage();

        if ($sqlState === '23505') {
            if (str_contains($message, 'uq_events_subcategory_slug')) {
                Json::error('An event with this slug already exists in the selected subcategory.', 409);
            }

            if (str_contains($message, 'events_slug_key')) {
                Json::error('An event with this slug already exists.', 409);
            }

            if (str_contains($message, 'events_subcategory_id_key')) {
                Json::error('Schema conflict: only one event is currently allowed per subcategory. Please contact support.', 409);
            }

            Json::error('Duplicate event data detected. Please review slug/title uniqueness.', 409);
        }

        Logger::error('Event write PDO error [' . $sqlState . ']: ' . $message);
        Json::error('Internal server error', 500);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function respondNotModifiedIfEtagMatches(Request $request, array $payload): void
    {
        $serialized = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if (!is_string($serialized)) {
            return;
        }

        $etag = 'W/"' . sha1($serialized) . '"';
        header('Cache-Control: private, max-age=0, must-revalidate');
        header('ETag: ' . $etag);

        $ifNoneMatch = trim((string) ($request->header('if-none-match') ?? ''));
        if ($ifNoneMatch !== '' && $ifNoneMatch === $etag) {
            http_response_code(304);
            exit;
        }
    }
}
