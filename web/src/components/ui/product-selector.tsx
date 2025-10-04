'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { InventoryItem } from '@/types';
import { ChevronDown, Search } from 'lucide-react';

interface ProductSelectorProps {
  items: InventoryItem[];
  selectedCode: string;
  onSelect: (code: string) => void;
  disabled?: boolean;
  placeholder?: string;
  variant?: 'dark' | 'light';
}

export function ProductSelector({
  items,
  selectedCode,
  onSelect,
  disabled = false,
  placeholder = "Select product...",
  variant = 'dark'
}: ProductSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find(item => item.finalCode === selectedCode);

  const filteredItems = items.filter(item =>
    item.finalCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    onSelect(code);
    setIsOpen(false);
    setSearchTerm('');
  };

  const isDark = variant === 'dark';
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none disabled:opacity-50 flex items-center justify-between ${
          isDark 
            ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500' 
            : 'bg-white border-gray-300 text-black focus:border-blue-500'
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {selectedItem ? (
            <>
              {selectedItem.images.length > 0 ? (
                <div className="relative w-8 h-8 rounded overflow-hidden">
                  <Image
                    src={selectedItem.images[0]}
                    alt={selectedItem.finalCode}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
              ) : (
                <div className={`w-8 h-8 rounded flex items-center justify-center text-xs ${
                  isDark ? 'bg-gray-600' : 'bg-gray-200 text-gray-600'
                }`}>
                  No IMG
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <div className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedItem.finalCode}
                </div>
                <div className={`text-sm truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {selectedItem.color} • M:{selectedItem.sizes.M} L:{selectedItem.sizes.L} XL:{selectedItem.sizes.XL} XXL:{selectedItem.sizes.XXL}
                </div>
              </div>
            </>
          ) : (
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-full min-w-[400px] mt-1 border rounded-md shadow-lg max-h-64 overflow-hidden ${
          isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
        }`}>
          <div className="p-2">
            <div className="relative">
              <Search className={`absolute left-2 top-2.5 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-8 pr-3 py-2 border rounded text-sm focus:outline-none ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-black placeholder-gray-500 focus:border-blue-500'
                }`}
              />
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className={`px-3 py-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No products found
              </div>
            ) : (
              filteredItems.map(item => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => handleSelect(item.finalCode)}
                  className={`w-full px-3 py-2 text-left flex items-center gap-3 transition-colors ${
                    isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  {item.images.length > 0 ? (
                    <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                      <Image
                        src={item.images[0]}
                        alt={item.finalCode}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div className={`w-10 h-10 rounded flex items-center justify-center text-xs ${
                      isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                    }`}>
                      No IMG
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {item.finalCode}
                    </div>
                    <div className={`text-sm truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {item.color} • ৳{item.sellPrice}
                    </div>
                    <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      M: {item.sizes.M} | L: {item.sizes.L} | XL: {item.sizes.XL} | XXL: {item.sizes.XXL}
                    </div>
                    {item.description && (
                      <div className={`text-xs truncate mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {item.description}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
