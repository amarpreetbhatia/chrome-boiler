import React from 'react';
import './Options.css';

interface Props {
  title: string;
}

const Options: React.FC<Props> = ({ title }: Props) => {
  const [enabled, setEnabled] = React.useState(true);

  React.useEffect(() => {
    try {
      chrome.storage.local.get(['options'], (data) => {
        const flag = data.options?.floatingButton;
        setEnabled(flag !== false);
      });
    } catch { }
  }, []);

  const onToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setEnabled(val);
    try {
      chrome.storage.local.get(['options'], (data) => {
        const options = data.options || {};
        options.floatingButton = val;
        chrome.storage.local.set({ options });
      });
    } catch { }
  };

  return (
    <div className="OptionsContainer">
      <h2>{title} Page</h2>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={enabled} onChange={onToggle} />
        Enable floating notes button on websites
      </label>
    </div>
  );
};

export default Options;
