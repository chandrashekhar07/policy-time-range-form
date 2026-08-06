import { useState } from 'react';
import { PolicyForm } from '@/components/PolicyForm';
import { PolicyFormData } from '@/types';

function App() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);

  function handleSave(data: PolicyFormData) {
    console.log('Saved policy:', data);
    setOpen(false);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
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
      {toast && <div className="toast">Policy saved successfully.</div>}
    </div>
  );
}

export default App;
