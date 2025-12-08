"use client";

export default function SOSPage() {
  const contacts = [
    { id: 1, name: "Lebo M.", initials: "LM" },
    { id: 2, name: "Nadia K.", initials: "NK" },
    { id: 3, name: "Anonymous", initials: "A" }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col">
      {/* Header */}
      <header className="text-center py-10">
        <h1 className="text-3xl font-bold text-purple-700 tracking-wide">
          SafeHER SOS
        </h1>
        <p className="text-gray-600 mt-2">
          Immediate help, shared with your trusted contacts.
        </p>
      </header>

      {/* SOS Button */}
      <section className="flex justify-center mt-4 mb-10">
        <button
          className="w-48 h-48 rounded-full bg-purple-600 text-white text-5xl font-bold shadow-lg 
                     flex items-center justify-center
                     hover:bg-purple-700 transition-all duration-300
                     animate-pulse
                     shadow-purple-300/50"
        >
          SOS
        </button>
      </section>

      {/* Quick Actions */}
      <div className="max-w-xl mx-auto grid grid-cols-3 gap-4 mb-10 px-6">
        <button className="bg-purple-100 text-purple-700 py-3 rounded-xl font-medium hover:bg-purple-200 transition">
          Share Location
        </button>
        <button className="bg-purple-100 text-purple-700 py-3 rounded-xl font-medium hover:bg-purple-200 transition">
          Message Contacts
        </button>
        <button className="bg-purple-100 text-purple-700 py-3 rounded-xl font-medium hover:bg-purple-200 transition">
          Call
        </button>
      </div>

      {/* Trusted Contacts */}
      <section className="max-w-xl mx-auto w-full px-6 mb-20">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          Trusted Contacts
        </h2>

        <div className="space-y-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between bg-white border border-purple-100 shadow-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold">
                  {contact.initials}
                </div>

                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-gray-500">Will receive alert</p>
                </div>
              </div>

              <button className="text-purple-600 font-semibold hover:underline text-sm">
                Notify
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Disclaimer */}
      <footer className="text-center text-gray-500 text-xs pb-8 px-6">
        SafeHER is a community tool and does not replace emergency services.  
        If you're in danger, call your local emergency number.
      </footer>
    </main>
  );
}
