import { useState } from 'react';
import { PolicyForm } from '@/components/PolicyForm';
import { PolicyFormData } from '@/types';

function App() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function handleSave(data: PolicyFormData) {
    console.log('Saved policy:', data);
    setToast('Policy saved. You can keep editing or close when done.');
    setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      {open ? (
        <PolicyForm onClose={() => setOpen(false)} onSave={handleSave} />
      ) : (
        <button className="open-btn" onClick={() => setOpen(true)}>
          Create New Policy
        </button>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
