<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api', name: 'api_docs_')]
final class DocsController extends AbstractController
{
    private string $projectDir;

    public function __construct(KernelInterface $kernel)
    {
        $this->projectDir = $kernel->getProjectDir();
    }

    #[Route('/openapi.json', name: 'openapi_spec', methods: ['GET'])]
    public function openApiSpec(): JsonResponse
    {
        $filePath = $this->projectDir . '/public/openapi.json';
        if (!file_exists($filePath)) {
            $filePath = dirname($this->projectDir) . '/docs/openapi.json';
        }

        if (!file_exists($filePath)) {
            return new JsonResponse(['error' => 'Spécification OpenAPI introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $content = (string) file_get_contents($filePath);
        $data = json_decode($content, true);

        return new JsonResponse($data, Response::HTTP_OK, [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, OPTIONS',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    #[Route('/docs', name: 'scalar_reference', methods: ['GET'])]
    public function scalarReference(): Response
    {
        $html = <<<HTML
<!doctype html>
<html lang="fr">
  <head>
    <title>Lefermier API — Référence Officielle des Développeurs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐔</text></svg>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0b0f19;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        overflow-x: hidden;
      }
      .custom-header {
        position: sticky;
        top: 0;
        z-index: 1000;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 20px;
        background: rgba(11, 15, 25, 0.96);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        color: #f1f5f9;
        transition: all 0.2s ease;
      }
      .brand-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 700;
        font-size: 1rem;
        letter-spacing: -0.02em;
        white-space: nowrap;
      }
      .badge-tag {
        background: #10b98122;
        color: #34d399;
        border: 1px solid #10b98144;
        padding: 2px 7px;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 600;
        white-space: nowrap;
      }
      .brand-subtitle {
        color: #64748b;
        font-size: 0.8rem;
        font-weight: 400;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        max-width: 100%;
        padding-bottom: 2px;
      }
      .header-actions::-webkit-scrollbar {
        display: none;
      }
      .link-btn {
        color: #94a3b8;
        text-decoration: none;
        font-size: 0.8rem;
        font-weight: 500;
        padding: 6px 10px;
        border-radius: 6px;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }
      .link-btn:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.15);
      }
      .postman-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: #ffffff !important;
        font-weight: 600;
        border: none;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }
      .postman-btn:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        transform: translateY(-1px);
      }

      /* MEDIA QUERIES RESPONSIVE */
      @media (max-width: 992px) {
        .custom-header {
          padding: 8px 16px;
        }
        .brand-subtitle {
          display: none;
        }
      }

      @media (max-width: 640px) {
        .custom-header {
          padding: 8px 12px;
          gap: 8px;
        }
        .brand-title {
          font-size: 0.92rem;
          gap: 6px;
        }
        .badge-tag {
          font-size: 0.65rem;
          padding: 1px 6px;
        }
        .header-actions {
          width: 100%;
          justify-content: flex-start;
          padding-top: 4px;
        }
        .link-btn {
          font-size: 0.74rem;
          padding: 5px 8px;
        }
      }
    </style>
  </head>
  <body>
    <header class="custom-header">
      <div class="brand-title">
        <span>🐔 Lefermier API</span>
        <span class="badge-tag">v1.0 • OpenAPI 3.1</span>
        <span class="brand-subtitle">Bénin & Afrique de l'Ouest (XOF)</span>
      </div>
      <div class="header-actions">
        <a class="link-btn" href="/api/docs/redoc" title="Vue Redoc 3 panneaux">Vue Redoc</a>
        <a class="link-btn" href="/api/docs/swagger" title="Vue Swagger UI">Swagger UI</a>
        <a class="link-btn" href="/api/openapi.json" target="_blank" title="Spécification brute JSON">OpenAPI JSON</a>
        <a class="link-btn postman-btn" href="/api/openapi.json" download="openapi.json">Télécharger Spécification</a>
      </div>
    </header>

    <script
      id="api-reference"
      data-url="/api/openapi.json"
      data-configuration='{
        "theme": "kepler",
        "darkMode": true,
        "showSidebar": true,
        "layout": "modern",
        "hideModels": false,
        "searchHotKey": "k",
        "defaultHttpClient": {
          "targetKey": "shell",
          "clientKey": "curl"
        }
      }'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
HTML;

        return new Response($html, Response::HTTP_OK, [
            'Content-Type' => 'text/html; charset=utf-8',
        ]);
    }

    #[Route('/docs/redoc', name: 'redoc_reference', methods: ['GET'])]
    public function redocReference(): Response
    {
        $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
  <head>
    <title>Lefermier API — Redoc Enterprise Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐔</text></svg>">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
      body { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <redoc spec-url="/api/openapi.json" expand-responses="200,201"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"> </script>
  </body>
</html>
HTML;

        return new Response($html, Response::HTTP_OK, [
            'Content-Type' => 'text/html; charset=utf-8',
        ]);
    }

    #[Route('/docs/swagger', name: 'swagger_reference', methods: ['GET'])]
    public function swaggerReference(): Response
    {
        $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Lefermier API — Swagger UI</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐔</text></svg>">
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>
HTML;

        return new Response($html, Response::HTTP_OK, [
            'Content-Type' => 'text/html; charset=utf-8',
        ]);
    }
}
