'use client';

import { toJpeg, toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

export type ExportFormat = 'png' | 'jpeg' | 'svg' | 'pdf';
export type ExportPageScope = 'current' | 'all';

type ExportOptions = {
  format: ExportFormat;
  scale: 1 | 2 | 3;
  scope: ExportPageScope;
  currentPage: number;
  projectName: string;
};

const WIDTH = 900;
const HEIGHT = 1450;

function safeName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'vocabulary-poster';
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function dataUrlToBlob(dataUrl: string) {
  return fetch(dataUrl).then((response) => response.blob());
}

async function waitForAssets(nodes: HTMLElement[]) {
  await document.fonts.ready;
  const images = nodes.flatMap((node) => Array.from(node.querySelectorAll('img')));
  await Promise.all(images.map(async (image) => {
    if (!image.complete) {
      await new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    }
    if (image.decode) await image.decode().catch(() => undefined);
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error(`Poster image failed to load: ${image.currentSrc || image.src}`);
    }
  }));
}

export async function exportPoster(nodes: HTMLElement[], options: ExportOptions) {
  const selected = options.scope === 'all' ? nodes : [nodes[options.currentPage]].filter(Boolean);
  if (!selected.length) throw new Error('No poster page is available to export.');
  await waitForAssets(selected);

  const base = safeName(options.projectName);
  const renderOptions = {
    width: WIDTH,
    height: HEIGHT,
    pixelRatio: options.scale,
    backgroundColor: '#ffffff',
    cacheBust: true,
    filter: (node: HTMLElement) => !node.hasAttribute?.('data-export-exclude')
  };

  if (options.format === 'pdf') {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [WIDTH, HEIGHT], hotfixes: ['px_scaling'] });
    for (let index = 0; index < selected.length; index += 1) {
      if (index > 0) pdf.addPage([WIDTH, HEIGHT], 'portrait');
      const png = await toPng(selected[index], { ...renderOptions, pixelRatio: 2 });
      pdf.addImage(png, 'PNG', 0, 0, WIDTH, HEIGHT, undefined, 'FAST');
    }
    download(pdf.output('blob'), `${base}.pdf`);
    return;
  }

  const extension = options.format === 'jpeg' ? 'jpg' : options.format;
  const render = async (node: HTMLElement) => {
    if (options.format === 'png') return dataUrlToBlob(await toPng(node, renderOptions));
    if (options.format === 'jpeg') return dataUrlToBlob(await toJpeg(node, { ...renderOptions, quality: 0.98 }));
    return dataUrlToBlob(await toSvg(node, { ...renderOptions, pixelRatio: 1 }));
  };

  if (selected.length === 1) {
    const pageNumber = options.scope === 'current' ? options.currentPage + 1 : 1;
    download(await render(selected[0]), `${base}-page-${String(pageNumber).padStart(2, '0')}.${extension}`);
    return;
  }

  const zip = new JSZip();
  for (let index = 0; index < selected.length; index += 1) {
    zip.file(`${base}-page-${String(index + 1).padStart(2, '0')}.${extension}`, await render(selected[index]));
  }
  download(await zip.generateAsync({ type: 'blob' }), `${base}-${options.format}-pages.zip`);
}
