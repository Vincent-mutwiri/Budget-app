import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    key?: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    required?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    className = '',
    required = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white cursor-pointer flex items-center justify-between focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${isOpen ? 'border-primary ring-1 ring-primary' : ''}`}
            >
                <span className={!selectedOption ? 'text-forest-400' : ''}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={20} className={`text-forest-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Hidden input for form validation if needed, though custom components usually need manual validation */}
            {required && (
                <input
                    type="text"
                    className="sr-only"
                    value={value}
                    onChange={() => { }}
                    required={required}
                    tabIndex={-1}
                />
            )}

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-forest-900 border border-forest-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {options.length === 0 ? (
                            <div className="p-4 text-center text-forest-400 text-sm">No options available</div>
                        ) : (
                            options.map((option) => (
                                <div
                                    key={option.key || option.value}
                                    onClick={() => handleSelect(option.value)}
                                    className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${option.value === value
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-white hover:bg-forest-800'
                                        }`}
                                >
                                    <span>{option.label}</span>
                                    {option.value === value && <Check size={16} />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
