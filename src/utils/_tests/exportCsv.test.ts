import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportProjectionCsv, exportPdf, exportChartPng } from '../exportCsv';
import type { AccountResults } from '../../types';

// ---------------------------------------------------------------------------
// JSDOM environment stubs
// ---------------------------------------------------------------------------

// Track Blob contents captured via the MockBlob constructor
let capturedBlobParts: BlobPart[] | undefined;
let capturedBlobType: string | undefined;
const createObjectURLSpy = vi.fn(() => 'blob:mock-url');
const revokeObjectURLSpy = vi.fn();

/** Replaces the global Blob constructor so we can inspect what's passed to it */
class MockBlob {
  constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
    capturedBlobParts = parts;
    capturedBlobType = options?.type;
  }
}

beforeEach(() => {
  capturedBlobParts = undefined;
  capturedBlobType = undefined;
  createObjectURLSpy.mockClear();
  revokeObjectURLSpy.mockClear();
  vi.stubGlobal('Blob', MockBlob);
  vi.stubGlobal('URL', {
    createObjectURL: createObjectURLSpy,
    revokeObjectURL: revokeObjectURLSpy,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal AccountResults object */
function makeAccountResults(
  name: AccountResults['accountName'] = 'Savings',
  rows: number = 2,
): AccountResults {
  const yearlyData = Array.from({ length: rows }, (_, i) => ({
    year: 2026 + i,
    age: 30 + i,
    salary: 60000,
    startingBalance: 10000 * (i + 1),
    contributions: 6000,
    interestEarned: 400,
    endingBalance: 10000 * (i + 1) + 6000 + 400,
    withdrawal: 0,
    monthlyData: Array.from({ length: 12 }, (_, m) => ({
      month: m + 1,
      monthYear: 'JAN 2026',
      salary: 5000,
      startingBalance: 10000,
      contribution: 500,
      interest: 33,
      withdrawal: 0,
      endingBalance: 10533,
      monthlyNetSalary: 3500,
    })),
  }));

  return {
    accountName: name,
    yearlyData,
    totalContributions: rows * 6000,
    totalInterest: rows * 400,
    finalBalance: 10000 * rows + rows * 6000 + rows * 400,
  };
}

// ---------------------------------------------------------------------------
// exportProjectionCsv
// ---------------------------------------------------------------------------
describe('exportProjectionCsv', () => {
  it('does not throw for empty accountResults array', () => {
    expect(() => exportProjectionCsv([])).not.toThrow();
  });

  it('creates a download link and triggers click', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    exportProjectionCsv([makeAccountResults()]);

    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);

    const link = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.tagName).toBe('A');
    expect(link.download).toMatch(/^portfolio-projection-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('creates an object URL and revokes it', () => {
    exportProjectionCsv([makeAccountResults()]);
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
  });

  it('correctly handles multiple accounts with a single download', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    exportProjectionCsv([
      makeAccountResults('Savings'),
      makeAccountResults('Pension'),
      makeAccountResults('Brokerage'),
    ]);
    // All accounts go into one CSV → still a single download
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
  });

  it('Blob is created with text/csv MIME type', () => {
    exportProjectionCsv([makeAccountResults()]);
    expect(capturedBlobType).toBe('text/csv');
  });

  it('CSV content includes header row with expected columns', () => {
    exportProjectionCsv([makeAccountResults()]);
    const content = capturedBlobParts?.[0] as string;
    expect(content).toBeDefined();
    const firstLine = content.split('\n')[0];
    expect(firstLine).toContain('Year');
    expect(firstLine).toContain('Age');
    expect(firstLine).toContain('Account');
    expect(firstLine).toContain('Starting Balance');
    expect(firstLine).toContain('Ending Balance');
    expect(firstLine).toContain('Net Salary');
  });

  it('CSV rows contain correct year, age and account name values', () => {
    exportProjectionCsv([makeAccountResults('Savings', 1)]);
    const content = capturedBlobParts?.[0] as string;
    const lines = content.split('\n');
    // header + 1 data row
    expect(lines.length).toBe(2);
    const dataRow = lines[1];
    expect(dataRow).toContain('2026');
    expect(dataRow).toContain('30');
    expect(dataRow).toContain('Savings');
  });

  it('aggregates monthly net salaries into annual value per row', () => {
    // Each month has monthlyNetSalary = 3500 → annual = 3500 * 12 = 42000
    exportProjectionCsv([makeAccountResults('Savings', 1)]);
    const content = capturedBlobParts?.[0] as string;
    const dataRow = content.split('\n')[1];
    expect(dataRow).toContain('42000.00');
  });

  it('multiple year rows produce the correct number of CSV data lines', () => {
    // 2 accounts × 3 rows each = 6 data rows + 1 header
    exportProjectionCsv([makeAccountResults('Savings', 3), makeAccountResults('Pension', 3)]);
    const content = capturedBlobParts?.[0] as string;
    const lines = content.split('\n');
    // 1 header + 6 data rows = 7
    expect(lines.length).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// exportPdf
// ---------------------------------------------------------------------------
describe('exportPdf', () => {
  it('calls window.print()', () => {
    const printSpy = vi.fn();
    vi.stubGlobal('print', printSpy);
    exportPdf();
    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// exportChartPng
// ---------------------------------------------------------------------------
describe('exportChartPng', () => {
  function makeMockCtx() {
    return {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    };
  }

  function makeMockOffscreenCanvas(ctx: ReturnType<typeof makeMockCtx> | null) {
    return {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
      toDataURL: vi.fn(() => 'data:image/png;base64,abc'),
    };
  }

  function makeMockLink() {
    return { href: '', download: '', click: vi.fn() };
  }

  function setup({
    isDark = false,
    hasContainer = true,
    hasCanvas = true,
    hasCtx = true,
  } = {}) {
    const mockCtx = hasCtx ? makeMockCtx() : null;
    const offscreen = makeMockOffscreenCanvas(mockCtx);
    const mockCanvas = { width: 100, height: 80 };
    const mockContainer = {
      querySelector: vi.fn(() => hasCanvas ? mockCanvas : null),
    };
    const mockLink = makeMockLink();
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as Node);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as Node);

    vi.spyOn(document.documentElement.classList, 'contains').mockReturnValue(isDark);
    vi.spyOn(document, 'querySelector').mockReturnValue(
      hasContainer ? mockContainer as unknown as Element : null
    );
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return offscreen as unknown as HTMLElement;
      if (tag === 'a') return mockLink as unknown as HTMLElement;
      return document.createElement(tag);
    });

    return { offscreen, mockCanvas, mockContainer, mockCtx, mockLink, appendChildSpy, removeChildSpy };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early when container is not found', () => {
    const { appendChildSpy } = setup({ hasContainer: false });
    expect(() => exportChartPng()).not.toThrow();
    expect(appendChildSpy).not.toHaveBeenCalled();
  });

  it('returns early when canvas is not found inside container', () => {
    const { appendChildSpy } = setup({ hasCanvas: false });
    expect(() => exportChartPng()).not.toThrow();
    expect(appendChildSpy).not.toHaveBeenCalled();
  });

  it('returns early when 2d context is unavailable', () => {
    const { appendChildSpy } = setup({ hasCtx: false });
    expect(() => exportChartPng()).not.toThrow();
    expect(appendChildSpy).not.toHaveBeenCalled();
  });

  it('creates a download link and clicks it (light mode)', () => {
    const { mockLink, mockCtx } = setup({ isDark: false });
    exportChartPng();
    expect(mockCtx!.fillRect).toHaveBeenCalled();
    expect(mockCtx!.drawImage).toHaveBeenCalled();
    expect(mockLink.click).toHaveBeenCalledTimes(1);
    expect(mockLink.download).toMatch(/\.png$/);
    expect(mockLink.href).toBe('data:image/png;base64,abc');
  });

  it('uses dark background when document has dark class', () => {
    const { mockCtx } = setup({ isDark: true });
    exportChartPng();
    expect(mockCtx!.fillStyle).toBe('#0f172a');
  });

  it('uses light background when document does not have dark class', () => {
    const { mockCtx } = setup({ isDark: false });
    exportChartPng();
    expect(mockCtx!.fillStyle).toBe('#ffffff');
  });

  it('accepts a custom container selector', () => {
    const { mockContainer } = setup();
    exportChartPng('#my-chart');
    expect(document.querySelector).toHaveBeenCalledWith('#my-chart');
    expect(mockContainer.querySelector).toHaveBeenCalledWith('canvas');
  });
});
