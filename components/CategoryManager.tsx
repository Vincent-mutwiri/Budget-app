import React, { useState } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { CategoriesList } from '../types';

interface CategoryManagerProps {
  onClose: () => void;
  customCategories: Array<{ name: string; type: 'income' | 'expense'; isDefault?: boolean }>;
  onDeleteCategory: (category: string) => void;
  onAddToDefault: (category: string) => void;
  onAddCategory?: (name: string, type: 'income' | 'expense') => void;
  onDeleteDefaultCategory?: (category: string) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  onClose,
  customCategories,
  onDeleteCategory,
  onAddToDefault,
  onAddCategory,
  onDeleteDefaultCategory
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddCategory = () => {
    if (newCategoryName.trim() && onAddCategory) {
      onAddCategory(newCategoryName.trim(), newCategoryType);
      setNewCategoryName('');
      setShowAddForm(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Manage Categories</h3>
        <button onClick={onClose} className="text-forest-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {customCategories.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-forest-300 mb-2">Categories</h4>
            <div className="space-y-2">
              {customCategories.map((cat, idx) => (
                <div key={`cat-${cat.name}-${idx}`} className="flex items-center justify-between p-3 bg-forest-800 border border-forest-700 rounded-lg group">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-white truncate">{cat.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap font-medium ${cat.type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {cat.type}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => onAddToDefault(cat.name)}
                      className="text-primary hover:text-primary/80 transition-colors p-1"
                      title="Add to default categories"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteCategory(cat.name)}
                      className="text-red-400 hover:text-red-300 transition-colors p-1"
                      title="Delete category"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {customCategories.length === 0 && !showAddForm && (
          <div className="text-center py-6">
            <p className="text-forest-400 text-sm mb-3">
              No custom categories yet.
            </p>
            {onAddCategory && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
              >
                <Plus size={16} />
                Add Custom Category
              </button>
            )}
          </div>
        )}

        {showAddForm && onAddCategory && (
          <div className="bg-forest-900 border border-forest-700 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-forest-300">Add New Category</h4>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="w-full px-3 py-2 bg-forest-950 border border-forest-700 rounded-lg text-white placeholder-forest-500 focus:outline-none focus:border-primary"
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setNewCategoryType('expense')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${newCategoryType === 'expense'
                  ? 'bg-red-500/20 text-red-400 border-2 border-red-500'
                  : 'bg-forest-950 text-forest-400 border border-forest-700'
                  }`}
              >
                Expense
              </button>
              <button
                onClick={() => setNewCategoryType('income')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${newCategoryType === 'income'
                  ? 'bg-green-500/20 text-green-400 border-2 border-green-500'
                  : 'bg-forest-950 text-forest-400 border border-forest-700'
                  }`}
              >
                Income
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                className="flex-1 py-2 px-4 bg-primary hover:bg-primary/90 disabled:bg-forest-700 disabled:text-forest-500 text-white rounded-lg transition-colors font-medium"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewCategoryName('');
                }}
                className="flex-1 py-2 px-4 bg-forest-800 hover:bg-forest-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {customCategories.length > 0 && onAddCategory && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-2 px-4 bg-forest-900 hover:bg-forest-800 border border-forest-700 hover:border-primary text-forest-300 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add Another Category
          </button>
        )}
      </div>
    </div>
  );
};