import { useState, useCallback } from 'react';

// Custom hook for managing Wiki state and operations
export function useWiki() {
  // State for the input modal
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptOptions, setPromptOptions] = useState({});
  const [promptResolver, setPromptResolver] = useState(null);

  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [selectedPageContent, setSelectedPageContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editPageId, setEditPageId] = useState(null); // ID of page being edited, null for new page
  const [editInitialContent, setEditInitialContent] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Separate loading state for wiki ops

  const loadPages = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.listWikiPages();
      if (result.success) {
        setPages(result.pages || []);
        return result.pages || []; // Return pages for immediate use if needed
      } else {
        console.error('Failed to list wiki pages:', result.message);
        alert(`Wiki ページ一覧の読み込みに失敗しました: ${result.message}`);
        setPages([]);
        return [];
      }
    } catch (err) {
      console.error('Error listing wiki pages:', err);
      alert('Wiki ページ一覧の読み込み中にエラーが発生しました。');
      setPages([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPageContent = useCallback(async (pageId) => {
    if (!pageId) {
      setSelectedPageContent('');
      return;
    }
    setIsLoading(true);
    try {
      const result = await window.electronAPI.readWikiPage(pageId);
      if (result.success) {
        setSelectedPageContent(result.content);
      } else {
        console.error(`Failed to read wiki page ${pageId}:`, result.message);
        alert(`Wiki ページ「${pageId}」の読み込みに失敗しました: ${result.message}`);
        setSelectedPageContent('エラー: ページを読み込めませんでした。');
      }
    } catch (err) {
      console.error(`Error reading wiki page ${pageId}:`, err);
      alert(`Wiki ページ「${pageId}」の読み込み中にエラーが発生しました。`);
      setSelectedPageContent('エラー: ページを読み込めませんでした。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectPage = useCallback((pageId) => {
    setSelectedPageId(pageId);
    loadPageContent(pageId);
    setIsEditing(false); // Ensure not in edit mode when selecting
  }, [loadPageContent]);

  // Function to open the input modal and return a promise
  const showInputPrompt = useCallback((options) => {
      return new Promise((resolve) => {
          setPromptOptions(options);
          setIsPromptOpen(true);
          setPromptResolver(() => resolve); // Store the resolve function
      });
  }, []);

  // Handlers for the modal buttons
  const handlePromptOk = useCallback((value) => {
      setIsPromptOpen(false);
      if (promptResolver) promptResolver({ success: true, value });
      setPromptResolver(null);
  }, [promptResolver]);

  const handlePromptCancel = useCallback(() => {
      setIsPromptOpen(false);
      if (promptResolver) promptResolver({ success: false, cancelled: true });
      setPromptResolver(null);
  }, [promptResolver]);


  const createPage = useCallback(async () => {
    // Use the custom input modal
    const result = await showInputPrompt({
        title: '新規ページ作成',
        message: '新しいページ名を入力してください:', // Removed character restriction message
        defaultValue: 'new-page'
    });

    if (result.success && result.value) {
      const newPageName = result.value.trim();
      // Allow wider range of characters, but disallow filesystem special chars
      // Regex explanation:
      // ^                   Start of string
      // (?!.*[/\\:*?"<>|]) Negative lookahead: Ensure none of the forbidden characters exist anywhere
      // .                   Match any character (except newline, but trim handles that)
      // +                   Match one or more characters
      // $                   End of string
      const forbiddenCharsRegex = /[/\\:*?"<>|]/; // Forbidden characters
      if (forbiddenCharsRegex.test(newPageName) || newPageName.startsWith('.')) {
           alert("無効なページ名です。ファイル名に使用できない文字（/ \\ : * ? \" < > |）が含まれているか、ピリオドで始まっています。"); return;
       }
       // if (newPageName.includes('/') || newPageName.includes('\\') || newPageName.startsWith('.')) {
       //  alert("無効なページ名です。スラッシュ、バックスラッシュ、ピリオドで始まる名前は使用できません。"); return;
       // }
       // Check for existing page name before proceeding
       if (pages.some(p => p.id === newPageName.trim())) {
         alert("同じ名前のページが既に存在します。"); return;
       }
       // If validation passes and name is unique, proceed
       setEditPageId(newPageName.trim());
       setEditInitialContent('');
       setIsEditing(true);
    } // Correct placement of closing brace for if (result.success && result.value)
    // Removed redundant code that was outside the if block
  }, [pages, showInputPrompt]); // Added showInputPrompt to dependencies

  const editPage = useCallback((pageId) => {
    setEditPageId(pageId);
    setEditInitialContent(selectedPageContent); // Use currently loaded content
    setIsEditing(true);
  }, [selectedPageContent]);

  const savePage = useCallback(async (pageId, content) => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.writeWikiPage(pageId, content);
      if (result.success) {
        const updatedPages = await loadPages(); // Refresh page list
        // If the saved page is the currently selected one, or no page was selected (new page case)
        if (pageId === selectedPageId || !selectedPageId) {
          setSelectedPageId(pageId); // Ensure it's selected
          setSelectedPageContent(content); // Update content immediately
        } else if (!updatedPages.some(p => p.id === selectedPageId) && updatedPages.length > 0) {
            // If the previously selected page was deleted, select the first available page
            selectPage(updatedPages[0].id);
        }
        setIsEditing(false);
        return true; // Indicate success
      } else {
        alert(`Wiki ページの保存に失敗しました: ${result.message}`);
        return false; // Indicate failure
      }
    } catch (err) {
      console.error(`Error saving wiki page ${pageId}:`, err);
      alert('Wiki ページの保存中にエラーが発生しました。');
      return false; // Indicate failure
    } finally {
      setIsLoading(false);
    }
  }, [loadPages, selectedPageId, selectPage]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    // Reload content if a page was selected before editing started
    if (selectedPageId) {
      loadPageContent(selectedPageId);
    }
  }, [selectedPageId, loadPageContent]);

  const deletePage = useCallback(async (pageId) => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.deleteWikiPage(pageId);
      if (result.success) {
        const remainingPages = await loadPages(); // Refresh page list
        if (pageId === selectedPageId) {
          // If deleted page was selected, select first remaining or clear selection
          if (remainingPages.length > 0) {
            selectPage(remainingPages[0].id);
          } else {
            setSelectedPageId(null);
            setSelectedPageContent('');
          }
        }
        return true; // Indicate success
      } else {
        alert(`Wiki ページ「${pageId}」の削除に失敗しました: ${result.message}`);
        return false; // Indicate failure
      }
    } catch (err) {
      console.error(`Error deleting wiki page ${pageId}:`, err);
      alert('Wiki ページの削除中にエラーが発生しました。');
      return false; // Indicate failure
    } finally {
      setIsLoading(false);
    }
  }, [loadPages, selectedPageId, selectPage]);

  const renamePage = useCallback(async (oldPageId, newPageId) => {
      if (!newPageId || newPageId.trim() === '') {
          alert('新しいページ名を入力してください。'); return false;
      }
      const trimmedNewPageId = newPageId.trim();
      const forbiddenCharsRegex = /[/\\:*?"<>|]/;
      if (forbiddenCharsRegex.test(trimmedNewPageId) || trimmedNewPageId.startsWith('.')) {
           alert("無効なページ名です。ファイル名に使用できない文字（/ \\ : * ? \" < > |）が含まれているか、ピリオドで始まっています。"); return false;
       }
       if (pages.some(p => p.id === trimmedNewPageId)) {
         alert("同じ名前のページが既に存在します。"); return false;
       }

      setIsLoading(true);
      try {
          const result = await window.electronAPI.renameWikiPage(oldPageId, trimmedNewPageId);
          if (result.success) {
              await loadPages(); // Refresh page list
              // If the renamed page was selected, update the selection
              if (oldPageId === selectedPageId) {
                  setSelectedPageId(trimmedNewPageId);
                  // Content remains the same, no need to reload
              }
              return true;
          } else {
              alert(`ページの名称変更に失敗しました: ${result.message}`);
              return false;
          }
      } catch (err) {
          console.error(`Error renaming wiki page ${oldPageId} to ${trimmedNewPageId}:`, err);
          alert('ページの名称変更中にエラーが発生しました。');
          return false;
      } finally {
          setIsLoading(false);
      }
  }, [pages, loadPages, selectedPageId]);


  return {
    pages,
    selectedPageId,
    selectedPageContent,
    isEditing,
    editPageId,
    editInitialContent,
    isLoadingWiki: isLoading, // Rename for clarity
    loadPages,
    selectPage,
    createPage,
    editPage,
    savePage,
    cancelEdit,
    deletePage,
    renamePage, // Expose rename function
    // Expose setters needed for import handling in App.jsx
    setPages,
    setSelectedPageId,
    setSelectedPageContent,
    // Modal state and handlers to be used in App.jsx
    isPromptOpen,
    promptOptions,
    handlePromptOk,
    handlePromptCancel,
  };
}
