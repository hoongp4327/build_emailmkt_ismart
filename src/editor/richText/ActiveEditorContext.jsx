import React, { createContext, useContext, useState, useCallback } from 'react'

const ActiveEditorContext = createContext({
  activeEditor: null,
  isSingleLine: false,
  setActiveEditor: () => {},
  clearActiveEditor: () => {},
})

export function ActiveEditorProvider({ children }) {
  const [editorState, setEditorState] = useState({
    editor: null,
    isSingleLine: false,
  })

  const setActiveEditor = useCallback((editor, options = {}) => {
    setEditorState({
      editor,
      isSingleLine: Boolean(options.isSingleLine),
    })
  }, [])

  const clearActiveEditor = useCallback((editor) => {
    setEditorState((prev) => {
      // Chỉ xóa nếu editor đang unmount / blur đúng là editor hiện tại
      if (!editor || prev.editor === editor) {
        return { editor: null, isSingleLine: false }
      }
      return prev
    })
  }, [])

  return (
    <ActiveEditorContext.Provider
      value={{
        activeEditor: editorState.editor,
        isSingleLine: editorState.isSingleLine,
        setActiveEditor,
        clearActiveEditor,
      }}
    >
      {children}
    </ActiveEditorContext.Provider>
  )
}

export function useActiveEditor() {
  return useContext(ActiveEditorContext)
}
