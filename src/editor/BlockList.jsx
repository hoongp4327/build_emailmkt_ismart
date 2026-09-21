import React, { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableBlockItem } from './SortableBlockItem.jsx'
import { AddBlockMenu } from './AddBlockMenu.jsx'

export function BlockList({
  blocks = [],
  selectedBlockId,
  onSelectBlock,
  onAddBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onToggleHidden,
  onMoveBlock,
  onReorderBlocks,
}) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id)
      const newIndex = blocks.findIndex((b) => b.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderBlocks(oldIndex, newIndex)
      }
    }
  }

  const blockIds = blocks.map((b) => b.id)

  return (
    <aside className="block-list-panel">
      <div className="panel-top-action">
        <button
          type="button"
          className="button orange full-width add-block-btn"
          onClick={() => setIsAddMenuOpen(true)}
        >
          <span className="plus-icon">+</span> Thêm khối
        </button>
      </div>

      <div className="block-list-scroll">
        {blocks.length === 0 ? (
          <div className="empty-list-notice">
            <p>Chưa có khối nào trong email.</p>
            <p className="sub-text">Bấm nút trên để thêm khối đầu tiên.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
              <div className="block-items-wrapper">
                {blocks.map((block, index) => (
                  <SortableBlockItem
                    key={block.id}
                    block={block}
                    isSelected={block.id === selectedBlockId}
                    onSelect={onSelectBlock}
                    onDuplicate={onDuplicateBlock}
                    onToggleHidden={onToggleHidden}
                    onDelete={onDeleteBlock}
                    onMoveUp={() => onMoveBlock(index, index - 1)}
                    onMoveDown={() => onMoveBlock(index, index + 1)}
                    isFirst={index === 0}
                    isLast={index === blocks.length - 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <AddBlockMenu
        isOpen={isAddMenuOpen}
        onClose={() => setIsAddMenuOpen(false)}
        onSelectType={(type) => onAddBlock(type)}
      />
    </aside>
  )
}
