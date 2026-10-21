<?php

declare(strict_types=1);

namespace App\Service;

use Dompdf\Dompdf;
use Dompdf\Options;
use Symfony\Component\HttpFoundation\Response;
use Twig\Environment;

class PdfService
{
    public function __construct(
        private readonly Environment $twig,
    ) {
    }

    /**
     * Génère la chaîne binaire du PDF à partir d'un template Twig.
     *
     * @param array<string, mixed> $params
     */
    public function renderPdf(
        string $template,
        array $params = [],
        string $paper = 'A4',
        string $orientation = 'portrait',
    ): string {
        $html = $this->twig->render($template, $params);

        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', true);
        $options->setDefaultFont('DejaVu Sans');
        $options->set('dpi', 96);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper($paper, $orientation);
        $dompdf->render();

        /** @var string|null $output */
        $output = $dompdf->output();

        return $output ?? '';
    }

    /**
     * Crée une Response Symfony prête à être retournée par un contrôleur.
     *
     * @param array<string, mixed> $params
     */
    public function createPdfResponse(
        string $template,
        array $params = [],
        string $filename = 'document.pdf',
        bool $inline = true,
        string $paper = 'A4',
        string $orientation = 'portrait',
    ): Response {
        $pdfContent = $this->renderPdf($template, $params, $paper, $orientation);

        $disposition = $inline ? 'inline' : 'attachment';

        return new Response($pdfContent, Response::HTTP_OK, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => sprintf('%s; filename="%s"', $disposition, $filename),
            'Cache-Control' => 'private, max-age=0, must-revalidate',
            'Pragma' => 'public',
        ]);
    }
}
