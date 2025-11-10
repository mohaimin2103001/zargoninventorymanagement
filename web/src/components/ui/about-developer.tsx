export default function AboutDeveloper() {
  return (
    <div className="mt-12 bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-6 rounded-xl shadow-md border border-blue-200">
      <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">About Developer</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Developer Information Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-100">
          <h3 className="text-xl font-semibold mb-4 text-blue-700">Developer Information</h3>
          <div className="space-y-3 text-gray-700">
            <p>
              <span className="font-semibold text-gray-800">Name:</span> Md Wariul Mohaimin
            </p>
            <p>
              <span className="font-semibold text-gray-800">Department:</span> Computer Science & Engineering (CSE)
            </p>
            <p>
              <span className="font-semibold text-gray-800">Institution:</span> Rajshahi University of Engineering & Technology
            </p>
            <p>
              <span className="font-semibold text-gray-800">Series:</span> 21 Series
            </p>
            <p>
              <span className="font-semibold text-gray-800">ID No:</span> 2103001
            </p>
            <p>
              <span className="font-semibold text-gray-800">Phone:</span> 01751154790
            </p>
          </div>
        </div>

        {/* Special Thanks Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-100">
          <h3 className="text-xl font-semibold mb-4 text-blue-700">Special Thanks</h3>
          <p className="text-gray-700 mb-4">
            Big thanks to <span className="font-bold text-indigo-600">Sadman Sakib</span> for their support and guidance in this project.
          </p>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 font-medium">Zargon Inventory Management System</p>
            <p className="text-xs text-gray-500 mt-1">© 2025 All rights reserved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
