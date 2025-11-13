import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './AddUsersModal.css';

// Define the User shape
interface IUser {
  _id: string;
  email: string;
  role: string;
  profile: {
    firstName: string;
    lastName: string;
  };
}

interface IProps {
  onClose: () => void;
  onSave: (users: IUser[]) => void;
  initialSelectedUsers: IUser[];
}

const AddUsersModal: React.FC<IProps> = ({ onClose, onSave, initialSelectedUsers }) => {
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Map<string, IUser>>(
    new Map(initialSelectedUsers.map(u => [u._id, u]))
  );
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch all users from the organization
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get('http://localhost:5001/api/users/my-organization');
        setAllUsers(data);
        if (data.length === 0) {
          setError('No users found in your organization');
        }
      } catch (error: any) {
        console.error('Failed to fetch users', error);
        setError('Failed to load users. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Handle ESC key to close modal and auto-focus search
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    // Auto-focus search input when modal opens
    if (!isLoading && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isLoading]);

  const handleSelectUser = (user: IUser) => {
    setSelectedUsers(prev => {
      const newMap = new Map(prev);
      if (newMap.has(user._id)) {
        newMap.delete(user._id);
      } else {
        newMap.set(user._id, user);
      }
      return newMap;
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      // Deselect all
      setSelectedUsers(new Map());
    } else {
      // Select all from current filter
      const newMap = new Map();
      filteredUsers.forEach(user => newMap.set(user._id, user));
      setSelectedUsers(newMap);
    }
  };

  const handleSave = () => {
    onSave(Array.from(selectedUsers.values()));
    onClose();
  };

  const filteredUsers = allUsers.filter(user =>
    user.email.toLowerCase().includes(searchText.toLowerCase()) ||
    `${user.profile.firstName} ${user.profile.lastName}`.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add Users to Session</h2>
        
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search by name or email..."
          className="modal-search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          autoFocus
        />
        
        <div className="modal-user-list">
          {isLoading ? (
            <div className="modal-loading">
              <p>Loading users...</p>
            </div>
          ) : error ? (
            <div className="modal-error">
              <p>{error}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="modal-empty">
              <p>{searchText ? 'No users found matching your search' : 'No users available'}</p>
            </div>
          ) : (
            <>
              <div className="modal-user-item select-all">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                  onChange={handleSelectAll}
                />
                <label>Select All ({filteredUsers.length})</label>
              </div>
              {filteredUsers.map(user => (
                <div key={user._id} className="modal-user-item">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user._id)}
                    onChange={() => handleSelectUser(user)}
                  />
                  <label>{user.profile.firstName} {user.profile.lastName} ({user.email}) - {user.role}</label>
                </div>
              ))}
            </>
          )}
        </div>
        
        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary">
            Save ({selectedUsers.size}) Users
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddUsersModal;

