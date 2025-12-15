import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface AddAccountFormProps {
  onAdd: (account: any) => Promise<void>;
  onClose: () => void;
  initialData?: any;
}

export const AddAccountForm: React.FC<AddAccountFormProps> = ({ onAdd, onClose, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<'asset' | 'liability'>(initialData?.type || 'asset');
  const [balance, setBalance] = useState(initialData?.balance?.toString() || '');
  const [institution, setInstitution] = useState(initialData?.institution || '');
  const [isMain, setIsMain] = useState(initialData?.isMain || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !balance || !institution) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        ...initialData, // Preserve existing fields like id, logoUrl, etc.
        name,
        type,
        balance: parseFloat(balance),
        institution,
        isMain,
        logoUrl: initialData?.logoUrl || 'https://via.placeholder.com/48',
        lastSynced: initialData?.lastSynced || new Date().toISOString(),
        syncStatus: initialData?.syncStatus || 'success'
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-forest-300 text-sm font-medium mb-2">Account Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. KCB Savings"
          className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          required
        />
      </div>

      <div>
        <label className="block text-forest-300 text-sm font-medium mb-2">Account Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'asset' | 'liability')}
          className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="asset">Asset</option>
          <option value="liability">Liability</option>
        </select>
      </div>

      <div>
        <label className="block text-forest-300 text-sm font-medium mb-2">Institution</label>
        <input
          type="text"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          placeholder="e.g. KCB Bank"
          className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          required
        />
      </div>

      <div>
        <label className="block text-forest-300 text-sm font-medium mb-2">Current Balance</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">KSh</span>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0.00"
            className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isMain"
          checked={isMain}
          onChange={(e) => setIsMain(e.target.checked)}
          className="w-4 h-4 text-primary bg-forest-950 border-forest-700 rounded focus:ring-primary focus:ring-2"
        />
        <label htmlFor="isMain" className="text-forest-300 text-sm">
          Set as main account (all income and expenses will be centralized here)
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary hover:bg-primary/90 text-forest-950 font-bold py-3.5 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 size={18} className="animate-spin" />}
        {initialData ? 'Update Account' : 'Add Account'}
      </button>
    </form>
  );
};