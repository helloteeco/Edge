"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getProject } from "@/lib/store";
import { getTotalSleeping } from "@/lib/sleep-optimizer";
import type { Project } from "@/lib/types";

export default function PrintBriefPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading brief...</div>}>
      <PrintBriefContent />
    </Suspense>
  );
}

/**
 * Print-friendly design brief. Access via /projects/print?id=PROJECT_ID
 * Use Cmd+P / Ctrl+P to print or save as PDF.
 */
function PrintBriefContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id");
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (projectId) {
      setProject(getProject(projectId));
    }
  }, [projectId]);

  if (!project) {
    return (
      <div className="p-8 text-center text-gray-500">
        Project not found. Make sure you have the correct project ID.
      </div>
    );
  }

  const sleeping = getTotalSleeping(project.rooms);
  const totalCost = project.rooms.reduce(
    (s, r) => s + r.furniture.reduce((fs, f) => fs + f.item.price * f.quantity, 0),
    0
  );

  return (
    <div className="max-w-4xl mx-auto px-8 py-12 font-sans text-gray-900 print:px-0 print:py-0">
      {/* Print button (hidden in print) */}
      <div className="mb-8 flex items-center justify-between print:hidden">
        <button
          onClick={() => window.history.back()}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          &larr; Back to Project
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-6 mb-8">
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <p className="text-lg text-gray-600 mt-1">
          {project.property.address}, {project.property.city},{" "}
          {project.property.state}
        </p>
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Client:</span>{" "}
            <strong>{project.client.name}</strong>
          </div>
          <div>
            <span className="text-gray-500">Style:</span>{" "}
            <strong className="capitalize">{project.style.replace(/-/g, " ")}</strong>
          </div>
          <div>
            <span className="text-gray-500">Sleeps:</span>{" "}
            <strong>{sleeping} guests</strong>
          </div>
          <div>
            <span className="text-gray-500">Budget:</span>{" "}
            <strong>${totalCost.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Property Details */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3 border-b border-gray-200 pb-2">
          Property Details
        </h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Size:</span>{" "}
            {project.property.squareFootage
              ? `${project.property.squareFootage.toLocaleString()} sqft`
              : "N/A"}
          </div>
          <div>
            <span className="text-gray-500">Layout:</span>{" "}
            {project.property.bedrooms} bed / {project.property.bathrooms} bath
          </div>
          <div>
            <span className="text-gray-500">Floors:</span>{" "}
            {project.property.floors}
          </div>
        </div>
        {project.client.preferences && (
          <div className="mt-3 text-sm">
            <span className="text-gray-500">Client Preferences:</span>{" "}
            <span className="italic">{project.client.preferences}</span>
          </div>
        )}
      </section>

      {/* Sleep Plan */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3 border-b border-gray-200 pb-2">
          Sleep Plan — {sleeping} Guests
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-4">Room</th>
              <th className="py-2 pr-4">Configuration</th>
              <th className="py-2 text-right">Sleeps</th>
            </tr>
          </thead>
          <tbody>
            {project.rooms
              .filter((r) => r.selectedBedConfig && r.selectedBedConfig.totalSleeps > 0)
              .map((room) => (
                <tr key={room.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-medium">{room.name}</td>
                  <td className="py-2 pr-4">
                    {room.selectedBedConfig!.name}
                  </td>
                  <td className="py-2 text-right">
                    {room.selectedBedConfig!.totalSleeps}
                  </td>
                </tr>
              ))}
            <tr className="font-bold">
              <td className="py-2" colSpan={2}>
                Total
              </td>
              <td className="py-2 text-right">{sleeping}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Furniture by Room */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3 border-b border-gray-200 pb-2">
          Furniture List — ${totalCost.toLocaleString()}
        </h2>
        {project.rooms
          .filter((r) => r.furniture.length > 0)
          .map((room) => {
            const roomTotal = room.furniture.reduce(
              (s, f) => s + f.item.price * f.quantity,
              0
            );
            return (
              <div key={room.id} className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">
                  {room.name}{" "}
                  <span className="text-gray-400 font-normal">
                    (${roomTotal.toLocaleString()})
                  </span>
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500 text-xs">
                      <th className="py-1 pr-3">Item</th>
                      <th className="py-1 pr-3">Vendor</th>
                      <th className="py-1 pr-3">Color / Material</th>
                      <th className="py-1 pr-3">Dimensions</th>
                      <th className="py-1 pr-3 text-right">Qty</th>
                      <th className="py-1 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {room.furniture.map((f) => (
                      <tr key={f.item.id} className="border-b border-gray-50">
                        <td className="py-1.5 pr-3 font-medium">
                          {f.item.vendorUrl ? (
                            <a href={f.item.vendorUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline print:text-black print:no-underline">
                              {f.item.name}
                            </a>
                          ) : f.item.name}
                        </td>
                        <td className="py-1.5 pr-3 text-gray-600">
                          {f.item.vendor}
                        </td>
                        <td className="py-1.5 pr-3 text-gray-600">
                          {f.item.color} / {f.item.material}
                        </td>
                        <td className="py-1.5 pr-3 text-gray-500 text-xs">
                          {f.item.widthIn}&quot;W &times; {f.item.depthIn}&quot;D &times; {f.item.heightIn}&quot;H
                        </td>
                        <td className="py-1.5 pr-3 text-right">{f.quantity}</td>
                        <td className="py-1.5 text-right">
                          ${(f.item.price * f.quantity).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

        {/* Grand total */}
        <div className="mt-4 pt-4 border-t-2 border-gray-900 flex justify-between text-lg font-bold">
          <span>Grand Total</span>
          <span>${totalCost.toLocaleString()}</span>
        </div>
      </section>

      {/* Mood Boards */}
      {project.moodBoards.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 border-b border-gray-200 pb-2">
            Mood Boards
          </h2>
          {project.moodBoards.map((board) => (
            <div key={board.id} className="mb-4">
              <h3 className="font-semibold text-gray-800">
                {board.name}{" "}
                <span className="text-gray-400 font-normal capitalize">
                  ({board.style.replace(/-/g, " ")})
                </span>
              </h3>
              <div className="flex gap-2 mt-2">
                {board.colorPalette.map((color, i) => (
                  <div key={i} className="text-center">
                    <div
                      className="h-8 w-8 rounded border border-gray-200"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[9px] text-gray-400">{color}</span>
                  </div>
                ))}
              </div>
              {board.inspirationNotes && (
                <p className="mt-2 text-sm text-gray-600 italic">
                  {board.inspirationNotes}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Scan Links */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3 border-b border-gray-200 pb-2">
          Reference Links
        </h2>
        <div className="text-sm space-y-1">
          {project.property.matterportLink && (
            <div>
              <span className="text-gray-500">Matterport:</span>{" "}
              {project.property.matterportLink}
            </div>
          )}
          {project.property.polycamLink && (
            <div>
              <span className="text-gray-500">Polycam:</span>{" "}
              {project.property.polycamLink}
            </div>
          )}
          {project.property.spoakLink && (
            <div>
              <span className="text-gray-500">Spoak:</span>{" "}
              {project.property.spoakLink}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
        Generated by Design Studio &middot; {new Date().toLocaleDateString()}
      </footer>
    </div>
  );
}
