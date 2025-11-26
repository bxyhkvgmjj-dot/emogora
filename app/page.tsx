export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-10 text-center">
        Welcome to Emogora
      </h1>

      <p className="text-gray-600 mb-8 text-center max-w-lg">
        Choose your space to begin your journey with your AI companion.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
       {/* Feel & Reflect */}
<a href="/chat?mode=feel" className="bg-white shadow-md rounded-xl p-6 hover:shadow-xl transition cursor-pointer block">
  <h2 className="text-2xl font-semibold text-blue-600 mb-2">
    Feel & Reflect
  </h2>
  <p className="text-gray-600">
    Talk about your thoughts, emotions, and experiences. Emogora helps
    you understand yourself deeply.
  </p>
</a>


        {/* Plan & Execute */}
       <a href="/chat?mode=plan" className="bg-white shadow-md rounded-xl p-6 hover:shadow-xl transition cursor-pointer block">
  <h2 className="text-2xl font-semibold text-green-600 mb-2">Plan & Execute</h2>
  <p className="text-gray-600">
    Improve daily discipline, productivity, and execution with guided planning.
  </p>
</a>


        {/* Grow My Career & Biz */}
        <a href="/chat?mode=grow" className="bg-white shadow-md rounded-xl p-6 hover:shadow-xl transition cursor-pointer block">
  <h2 className="text-2xl font-semibold text-purple-600 mb-2">Grow My Career & Biz</h2>
  <p className="text-gray-600">
    Boost your professional life, business clarity, communication, and confidence.
  </p>
</a>

      </div>
    </div>
  );
}
