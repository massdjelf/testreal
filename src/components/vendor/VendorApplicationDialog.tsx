"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface VendorApplicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  initialData?: {
    phone?: string | null
    vendorAddress?: string | null
    vendorIdNumber?: string | null
    vendorStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED"
  }
  onSubmitted: (payload: {
    phone: string
    vendorAddress: string
    vendorIdNumber: string
    vendorStatus: "PENDING"
    vendorFeePaid: true
  }) => void
}

export function VendorApplicationDialog({
  open,
  onOpenChange,
  userId,
  initialData,
  onSubmitted,
}: VendorApplicationDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState("")
  const [vendorAddress, setVendorAddress] = useState("")
  const [vendorIdNumber, setVendorIdNumber] = useState("")
  const [vendorFeePaid, setVendorFeePaid] = useState(false)

  useEffect(() => {
    if (open) {
      setPhone(initialData?.phone || "")
      setVendorAddress(initialData?.vendorAddress || "")
      setVendorIdNumber(initialData?.vendorIdNumber || "")
      setVendorFeePaid(false)
    }
  }, [initialData, open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/users/vendor-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          phone,
          vendorAddress,
          vendorIdNumber,
          vendorFeePaid,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit application")
      }

      onSubmitted({
        phone: data.phone,
        vendorAddress: data.vendorAddress,
        vendorIdNumber: data.vendorIdNumber,
        vendorStatus: "PENDING",
        vendorFeePaid: true,
      })

      toast({
        title: "Vendor request submitted",
        description: "Your profile is now pending admin review. You can continue in restricted mode while you wait.",
      })
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Unable to submit vendor request",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Apply to sell property</DialogTitle>
          <DialogDescription>
            Submit your vendor information for admin review. Your account stays in restricted mode until approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Workflow</Badge>
              <span className="text-sm text-muted-foreground">USER → PENDING → ADMIN REVIEW → VENDOR</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Pending applicants can still browse the map, but property publishing stays locked until approval.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor-phone">Phone number</Label>
              <Input
                id="vendor-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(555) 123-4567"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-id">Government ID / passport</Label>
              <Input
                id="vendor-id"
                value={vendorIdNumber}
                onChange={(event) => setVendorIdNumber(event.target.value)}
                placeholder="ID-123456789"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-address">Address</Label>
            <Input
              id="vendor-address"
              value={vendorAddress}
              onChange={(event) => setVendorAddress(event.target.value)}
              placeholder="123 Main Street, Miami, FL"
              required
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            A non-refundable <span className="font-semibold">$30 processing fee</span> is required before an admin reviews your vendor request.
          </div>

          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
            <Checkbox
              checked={vendorFeePaid}
              onCheckedChange={(checked) => setVendorFeePaid(Boolean(checked))}
            />
            <span className="text-sm text-muted-foreground">
              I confirm the $30 processing fee is collected and I understand I will only have restricted access until the admin approves my vendor request.
            </span>
          </label>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Continue in restricted mode
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !vendorFeePaid}>
              {loading ? "Submitting..." : "Submit for review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
