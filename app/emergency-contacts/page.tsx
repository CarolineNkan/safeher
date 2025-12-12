"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship?: string;
  created_at: string;
  updated_at: string;
}

interface ContactFormData {
  name: string;
  phone: string;
  relationship: string;
}

export default function EmergencyContactsPage() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    phone: "",
    relationship: ""
  });
  const [formErrors, setFormErrors] = useState<Partial<ContactFormData>>({});
  const [submitting, setSubmitting] = useState(false);

  // Load contacts on component mount
  useEffect(() => {
    loadContacts();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/emergency-contacts");
      const data = await response.json();

      if (data.success) {
        setContacts(data.contacts || []);
      } else {
        setError(data.message || "Failed to load emergency contacts");
      }
    } catch (err) {
      console.error("Load contacts error:", err);
      setError("Failed to load emergency contacts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (data: ContactFormData): Partial<ContactFormData> => {
    const errors: Partial<ContactFormData> = {};

    // Validate name
    if (!data.name.trim()) {
      errors.name = "Name is required";
    } else if (data.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    // Validate phone number
    if (!data.phone.trim()) {
      errors.phone = "Phone number is required";
    } else {
      const cleanPhone = data.phone.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        errors.phone = "Phone number must be 10-15 digits";
      }
    }

    // Relationship is optional but validate if provided
    if (data.relationship && data.relationship.trim().length > 50) {
      errors.relationship = "Relationship must be less than 50 characters";
    }

    return errors;
  };

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length > 10) {
      return `+${cleaned.slice(0, -10)} (${cleaned.slice(-10, -7)}) ${cleaned.slice(-7, -4)}-${cleaned.slice(-4)}`;
    }
    
    return phone;
  };

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const url = editingContact 
        ? `/api/emergency-contacts/${editingContact.id}`
        : "/api/emergency-contacts";
      
      const method = editingContact ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          relationship: formData.relationship.trim() || null
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(editingContact 
          ? "Emergency contact updated successfully" 
          : "Emergency contact added successfully"
        );
        
        // Reset form and reload contacts
        resetForm();
        await loadContacts();
      } else {
        setError(data.message || "Failed to save emergency contact");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to save emergency contact. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship || ""
    });
    setShowAddForm(true);
    setFormErrors({});
  };

  const handleDelete = async (contactId: string) => {
    if (deleteConfirm !== contactId) {
      setDeleteConfirm(contactId);
      return;
    }

    try {
      const response = await fetch(`/api/emergency-contacts/${contactId}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Emergency contact deleted successfully");
        await loadContacts();
      } else {
        setError(data.message || "Failed to delete emergency contact");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete emergency contact. Please try again.");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", phone: "", relationship: "" });
    setFormErrors({});
    setShowAddForm(false);
    setEditingContact(null);
  };

  const getRelationshipEmoji = (relationship?: string): string => {
    if (!relationship) return "👤";
    
    const rel = relationship.toLowerCase();
    if (rel.includes("parent") || rel.includes("mom") || rel.includes("dad") || rel.includes("mother") || rel.includes("father")) return "👨‍👩‍👧‍👦";
    if (rel.includes("spouse") || rel.includes("husband") || rel.includes("wife") || rel.includes("partner")) return "💑";
    if (rel.includes("sibling") || rel.includes("brother") || rel.includes("sister")) return "👫";
    if (rel.includes("friend")) return "👥";
    if (rel.includes("colleague") || rel.includes("coworker")) return "💼";
    if (rel.includes("neighbor")) return "🏠";
    if (rel.includes("doctor") || rel.includes("medical")) return "👩‍⚕️";
    
    return "👤";
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-purple-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-purple-900">
                Emergency Contacts
              </h1>
              <p className="text-purple-600 mt-1">
                Manage your trusted contacts for SOS notifications
              </p>
            </div>
            <Link
              href="/sos"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <span>🚨</span>
              <span>SOS</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700">
              <span>❌</span>
              <span className="font-semibold">Error</span>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700">
              <span>✅</span>
              <span className="font-semibold">Success</span>
            </div>
            <p className="text-green-600 mt-1">{success}</p>
          </div>
        )}

        {/* Add Contact Button */}
        {!showAddForm && (
          <div className="mb-8">
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
            >
              <span>➕</span>
              <span>Add Emergency Contact</span>
            </button>
          </div>
        )}

        {/* Add/Edit Contact Form */}
        {showAddForm && (
          <div className="mb-8 bg-white rounded-lg shadow-lg border border-purple-100">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingContact ? "Edit Emergency Contact" : "Add Emergency Contact"}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      formErrors.name ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="Enter contact's full name"
                    maxLength={100}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                {/* Phone Field */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      formErrors.phone ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="(555) 123-4567"
                    maxLength={20}
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Enter 10-15 digits. International numbers supported.
                  </p>
                </div>

                {/* Relationship Field */}
                <div>
                  <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship (Optional)
                  </label>
                  <select
                    id="relationship"
                    value={formData.relationship}
                    onChange={(e) => handleInputChange("relationship", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  >
                    <option value="">Select relationship...</option>
                    <option value="Parent">Parent</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Partner">Partner</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Child">Child</option>
                    <option value="Friend">Friend</option>
                    <option value="Colleague">Colleague</option>
                    <option value="Neighbor">Neighbor</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Other">Other</option>
                  </select>
                  {formErrors.relationship && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.relationship}</p>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                      submitting
                        ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                        : "bg-purple-600 text-white hover:bg-purple-700"
                    }`}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span>
                        <span>Saving...</span>
                      </span>
                    ) : (
                      <span>{editingContact ? "Update Contact" : "Add Contact"}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contacts List */}
        <div className="bg-white rounded-lg shadow-lg border border-purple-100">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Your Emergency Contacts ({contacts.length})
              </h2>
              {contacts.length > 0 && (
                <div className="text-sm text-gray-500">
                  These contacts will be notified during SOS activation
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Loading emergency contacts...</p>
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📞</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Emergency Contacts Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Add trusted contacts who will be notified when you activate SOS
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <span>➕</span>
                  <span>Add Your First Contact</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="text-3xl">
                          {getRelationshipEmoji(contact.relationship)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {contact.name}
                          </h3>
                          <p className="text-purple-600 font-medium">
                            {formatPhoneNumber(contact.phone)}
                          </p>
                          {contact.relationship && (
                            <p className="text-gray-600 text-sm mt-1">
                              {contact.relationship}
                            </p>
                          )}
                          <p className="text-gray-400 text-xs mt-2">
                            Added {new Date(contact.created_at).toLocaleDateString()}
                            {contact.updated_at !== contact.created_at && (
                              <span> • Updated {new Date(contact.updated_at).toLocaleDateString()}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(contact)}
                          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Edit contact"
                        >
                          <span className="text-lg">✏️</span>
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            deleteConfirm === contact.id
                              ? "text-red-700 bg-red-100 hover:bg-red-200"
                              : "text-gray-600 hover:text-red-600 hover:bg-red-50"
                          }`}
                          title={deleteConfirm === contact.id ? "Click again to confirm deletion" : "Delete contact"}
                        >
                          <span className="text-lg">
                            {deleteConfirm === contact.id ? "⚠️" : "🗑️"}
                          </span>
                        </button>
                      </div>
                    </div>
                    
                    {deleteConfirm === contact.id && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-sm font-semibold mb-2">
                          ⚠️ Confirm Deletion
                        </p>
                        <p className="text-red-600 text-sm mb-3">
                          Are you sure you want to delete {contact.name}? This action cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Information Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <span>ℹ️</span>
            <span>How Emergency Contacts Work</span>
          </h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>When you activate SOS, all your emergency contacts will receive notifications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Notifications include your location and a link to Google Maps</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Location updates are sent every 2 minutes while SOS is active</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>We recommend adding 2-5 trusted contacts for best coverage</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Make sure your contacts know about SafeHER and what SOS notifications mean</span>
            </li>
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link
            href="/sos"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
          >
            <span>🚨</span>
            <span>Go to SOS</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
          >
            <span>🏠</span>
            <span>Home</span>
          </Link>
        </div>
      </div>
    </main>
  );
}