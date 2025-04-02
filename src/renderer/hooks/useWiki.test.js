import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react'; // Import cleanup
import { useWiki } from './useWiki';

// Mock the Electron API used by the hook
// Use vi.fn() for all mocks to allow clearing
const mockElectronAPI = {
    listWikiPages: vi.fn(),
    readWikiPage: vi.fn(),
    writeWikiPage: vi.fn(),
    deleteWikiPage: vi.fn(),
    showPromptDialog: vi.fn(),
};
vi.stubGlobal('window', { electronAPI: mockElectronAPI });

describe('useWiki Hook', () => {
  let hookResult; // Variable to store the hook result across tests in this suite

  beforeEach(async () => { // Make beforeEach async if initial render needs act
    // Reset mocks before each test
    vi.clearAllMocks();
    // Provide default mock implementations
    mockElectronAPI.listWikiPages.mockResolvedValue({ success: true, pages: [] });
    mockElectronAPI.readWikiPage.mockResolvedValue({ success: true, content: '' });
    mockElectronAPI.writeWikiPage.mockResolvedValue({ success: true });
    mockElectronAPI.deleteWikiPage.mockResolvedValue({ success: true });
    mockElectronAPI.showPromptDialog.mockImplementation(async (options) => ({
        success: true, value: options?.defaultValue || 'test-page-name'
    }));
    // Render the hook once before all tests in this suite, potentially within act
    await act(async () => {
        hookResult = renderHook(() => useWiki());
    });
  });

  // Add cleanup after each test
  afterEach(() => {
    cleanup();
    hookResult.unmount(); // Unmount the hook after each test
  });


  it('should initialize with empty state', () => {
    const { result } = hookResult; // Use the result from beforeEach
    expect(result.current.pages).toEqual([]);
    expect(result.current.selectedPageId).toBeNull();
    expect(result.current.selectedPageContent).toBe('');
    expect(result.current.isEditing).toBe(false);
  });

  it('should load pages correctly', async () => {
      const mockPages = [{ id: 'page1', name: 'page1' }];
      mockElectronAPI.listWikiPages.mockResolvedValueOnce({ success: true, pages: mockPages });

      const { result } = hookResult; // Use the result from beforeEach

      await act(async () => {
          await result.current.loadPages();
      });

      expect(mockElectronAPI.listWikiPages).toHaveBeenCalledTimes(1);
      expect(result.current.pages).toEqual(mockPages);
  });

  it('should create a new page after prompt', async () => {
    const { result } = hookResult; // Use the result from beforeEach
    const testPageName = 'valid-page-name';
    mockElectronAPI.showPromptDialog.mockResolvedValueOnce({ success: true, value: testPageName });

    await act(async () => {
      await result.current.createPage();
    });

    expect(mockElectronAPI.showPromptDialog).toHaveBeenCalled();
    expect(result.current.isEditing).toBe(true);
    expect(result.current.editPageId).toBe(testPageName);
    expect(result.current.editInitialContent).toBe('');
  });

  it('should not create a page with invalid characters', async () => {
    const { result } = hookResult; // Use the result from beforeEach
    const invalidPageName = 'invalid/page';
    mockElectronAPI.showPromptDialog.mockResolvedValueOnce({ success: true, value: invalidPageName });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    await act(async () => {
      await result.current.createPage();
    });

    expect(mockElectronAPI.showPromptDialog).toHaveBeenCalled();
    expect(result.current.isEditing).toBe(false); // Should not enter editing mode
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('無効なページ名'));

    alertSpy.mockRestore(); // Clean up spy
  });

   it('should allow Japanese characters in page names', async () => {
     const { result } = hookResult; // Use the result from beforeEach
     const japanesePageName = 'テストページ';
     mockElectronAPI.showPromptDialog.mockResolvedValueOnce({ success: true, value: japanesePageName });

     await act(async () => {
       await result.current.createPage();
     });

     expect(mockElectronAPI.showPromptDialog).toHaveBeenCalled();
     expect(result.current.isEditing).toBe(true);
     expect(result.current.editPageId).toBe(japanesePageName);
   });

  // Add more tests for selectPage, editPage, savePage, cancelEdit, deletePage
});
