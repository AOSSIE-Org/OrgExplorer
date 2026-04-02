import { useEffect, useState } from "react";

export default function Topbar({ orgInput }: any) {
  const [orgName, setOrgName] = useState("");
  const [logo, setLogo] = useState("");
  const [debouncedInput, setDebouncedInput] = useState("");

  // Debounce 
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(orgInput);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [orgInput]);

  //  API call only after debounce
  useEffect(() => {
    if (!debouncedInput) return;

    const orgs = debouncedInput.split(",").map((o: string) => o.trim());

    // name update
    setOrgName(orgs.join(" + "));

    //  fetch only first org logo
    fetch(`https://api.github.com/orgs/${orgs[0]}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Org not found");
        }
        return res.json();
      })
      .then((data) => {
        setLogo(data.avatar_url);
      })
      .catch((err) => {
        console.error("Error fetching org:", err);
        setLogo(""); 
      });

  }, [debouncedInput]);

  return (
    <div className="flex items-center justify-between px-6 py-4 h-32 border-b border-gray-800 bg-[#0B1220]">

      {/* LEFT */}
      <div className="flex items-center gap-3 text-2xl">
        {logo ? (
          <img
            src={logo}
            className="w-12 h-12 rounded-full border border-gray-700 text-2xl"
          />
        ) : (
          <div className="w-8 h-8 bg-gray-700 rounded-full text-2xl"></div>
        )}

        <h2 className="text-4xl font-semibold text-green-400 ">
          {orgName || "OrgExplorer"}
        </h2>
      </div>
    </div>
  );
}

// import { useEffect, useState } from "react";

// export default function Topbar({ orgInput }: any) {
//   const [orgName, setOrgName] = useState("");
//   const [logo, setLogo] = useState("");
//   const [debouncedInput, setDebouncedInput] = useState("");

//   // ✅ STEP 1: Debounce (IMPORTANT)
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedInput(orgInput);
//     }, 500); // 500ms delay

//     return () => clearTimeout(timer);
//   }, [orgInput]);

//   // ✅ STEP 2: API call only after debounce
//   useEffect(() => {
//     if (!debouncedInput) return;

//     const orgs = debouncedInput.split(",").map((o: string) => o.trim());

//     // 👉 name update
//     setOrgName(orgs.join(" + "));

//     // 👉 fetch only first org logo
//     fetch(`https://api.github.com/orgs/${orgs[0]}`)
//       .then((res) => {
//         if (!res.ok) {
//           throw new Error("Org not found");
//         }
//         return res.json();
//       })
//       .then((data) => {
//         setLogo(data.avatar_url);
//       })
//       .catch((err) => {
//         console.error("Error fetching org:", err);
//         setLogo(""); // reset if error
//       });

//   }, [debouncedInput]);

//   return (
//     <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#0B1220]">

//       {/* LEFT */}
//       <div className="flex items-center gap-3">
//         {logo ? (
//           <img
//             src={logo}
//             className="w-8 h-8 rounded-full border border-gray-700"
//           />
//         ) : (
//           <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
//         )}

//         <h2 className="text-lg font-semibold text-green-400">
//           {orgName || "OrgExplorer"}
//         </h2>
//       </div>

//       {/* RIGHT */}
//       <div className="flex items-center gap-4">
//         <span>🔔</span>
//         <div className="flex items-center gap-2">
//           <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
//           <span>Tom Cook</span>
//         </div>
//       </div>
//     </div>
//   );
// }
