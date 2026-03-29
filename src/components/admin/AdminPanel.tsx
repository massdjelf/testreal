"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Users,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  MapPin,
  Eye,
  ArrowLeft,
  Crown,
  Mail,
  Calendar,
  Trash2,
  ShieldCheck,
  Phone,
  FileBadge,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Property, User } from "@/types"

interface UserWithCount extends User {
  premiumExpiry: string | null
  _count?: {
    properties: number
    bids: number
  }
}

interface AdminStats {
  totalUsers: number
  totalProperties: number
  pendingProperties: number
  pendingVendorApplications: number
  totalBids: number
  totalValue: number
}

interface AdminPanelProps {
  userId: string
  onBack: () => void
}

export function AdminPanel({ userId, onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalProperties: 0,
    pendingProperties: 0,
    pendingVendorApplications: 0,
    totalBids: 0,
    totalValue: 0,
  })
  const [pendingProperties, setPendingProperties] = useState<Property[]>([])
  const [pendingVendors, setPendingVendors] = useState<UserWithCount[]>([])
  const [users, setUsers] = useState<UserWithCount[]>([])
  const [allProperties, setAllProperties] = useState<Property[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserWithCount | null>(null)
  const [selectedVendorRequest, setSelectedVendorRequest] = useState<UserWithCount | null>(null)
  const [premiumDuration, setPremiumDuration] = useState("30")
  const { toast } = useToast()

  useEffect(() => {
    void fetchOverviewData()
  }, [])

  useEffect(() => {
    if (activeTab === "users" && users.length === 0) {
      void fetchUsers()
    }

    if (activeTab === "properties" && allProperties.length === 0) {
      void fetchProperties()
    }
  }, [activeTab, allProperties.length, users.length])

  const fetchOverviewData = async () => {
    try {
      const [summaryResponse, propertySummaryResponse, pendingPropertiesResponse, pendingVendorsResponse] = await Promise.all([
        fetch("/api/users?summary=true"),
        fetch("/api/properties?includeUnverified=true&summary=true"),
        fetch("/api/properties?includeUnverified=true&pendingOnly=true&limit=25"),
        fetch("/api/users?vendorStatus=PENDING&limit=25"),
      ])

      const nextStats = { ...stats }

      if (summaryResponse.ok) {
        const summary = await summaryResponse.json()
        nextStats.totalUsers = summary.totalUsers
        nextStats.pendingVendorApplications = summary.pendingVendorApplications
      }

      if (propertySummaryResponse.ok) {
        const propertySummary = await propertySummaryResponse.json()
        nextStats.totalProperties = propertySummary.totalProperties
        nextStats.pendingProperties = propertySummary.pendingProperties
        nextStats.totalValue = propertySummary.totalValue
      }

      if (pendingPropertiesResponse.ok) {
        const pending = await pendingPropertiesResponse.json()
        setPendingProperties(pending)
      }

      if (pendingVendorsResponse.ok) {
        const vendorRequests = await pendingVendorsResponse.json()
        setPendingVendors(vendorRequests)
      }

      setStats((current) => ({ ...current, ...nextStats }))
    } catch (error) {
      console.error("Failed to fetch admin overview:", error)
      toast({
        title: "Error",
        description: "Failed to load admin overview",
        variant: "destructive",
      })
    } finally {
    }
  }

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch("/api/users?limit=50")
      if (response.ok) {
        const usersData = await response.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchProperties = async () => {
    setLoadingProperties(true)
    try {
      const response = await fetch("/api/properties?includeUnverified=true&limit=50")
      if (response.ok) {
        const properties = await response.json()
        setAllProperties(properties)
        setStats((current) => ({
          ...current,
          totalProperties: properties.length,
          totalValue: properties.reduce((sum: number, property: Property) => sum + property.totalPrice, 0),
        }))
      }
    } catch (error) {
      console.error("Failed to fetch properties:", error)
    } finally {
      setLoadingProperties(false)
    }
  }

  const refreshPendingQueues = async () => {
    await fetchOverviewData()
  }

  const handleUpgradeUser = async (targetUserId: string, role: string, durationDays: number) => {
    try {
      const premiumExpiry = new Date()
      premiumExpiry.setDate(premiumExpiry.getDate() + durationDays)

      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          role,
          premiumExpiry: durationDays > 0 ? premiumExpiry.toISOString() : null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update user")
      }

      toast({
        title: "User Updated",
        description: `User has been updated to ${role}`,
      })

      setSelectedUser(null)
      await fetchUsers()
      await fetchOverviewData()
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    }
  }

  const handleVendorDecision = async (targetUserId: string, vendorStatus: "APPROVED" | "REJECTED") => {
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          vendorStatus,
          vendorReviewedBy: userId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to review vendor application")
      }

      toast({
        title: vendorStatus === "APPROVED" ? "Vendor approved" : "Vendor request rejected",
        description:
          vendorStatus === "APPROVED"
            ? "The user now has vendor access."
            : "The user remains in restricted mode.",
      })

      setSelectedVendorRequest(null)
      await refreshPendingQueues()
      if (users.length > 0) {
        await fetchUsers()
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to update vendor request",
        variant: "destructive",
      })
    }
  }

  const handleVerifyProperty = async (propertyId: string, verify: boolean) => {
    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isVerified: verify,
          verifiedBy: userId,
          verifiedAt: new Date().toISOString(),
          status: verify ? "AVAILABLE" : "PENDING",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update property")
      }

      toast({
        title: verify ? "Property Verified" : "Property Rejected",
        description: verify
          ? "The property is now visible on the map"
          : "The property has been rejected",
      })
      setSelectedProperty(null)
      await refreshPendingQueues()
      if (allProperties.length > 0) {
        await fetchProperties()
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete property")
      }

      toast({
        title: "Property Deleted",
        description: "The property has been permanently removed",
      })
      setSelectedProperty(null)
      await refreshPendingQueues()
      if (allProperties.length > 0) {
        await fetchProperties()
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-semibold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Review vendor requests and approve listings without loading the full database.</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pending">
                Pending
                {(pendingProperties.length + pendingVendors.length) > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {pendingProperties.length + pendingVendors.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="bids">Bids</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="overview" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Properties</span>
                    </div>
                    <div className="text-2xl font-bold mt-1">{stats.totalProperties}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-500" />
                      <span className="text-sm text-muted-foreground">Pending Properties</span>
                    </div>
                    <div className="text-2xl font-bold mt-1">{stats.pendingProperties}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Vendor Reviews</span>
                    </div>
                    <div className="text-2xl font-bold mt-1">{stats.pendingVendorApplications}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Users</span>
                    </div>
                    <div className="text-2xl font-bold mt-1">{stats.totalUsers}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-muted-foreground">Pending Value</span>
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      ${(stats.totalValue / 1000000).toFixed(1)}M
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Workflow snapshot</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>1. New accounts register as <span className="font-medium text-foreground">USER</span>.</p>
                  <p>2. Users submit seller details + fee confirmation to enter <span className="font-medium text-foreground">PENDING</span>.</p>
                  <p>3. Admin reviews the request here and has the final say.</p>
                  <p>4. Approved users become <span className="font-medium text-foreground">VENDOR</span> and gain write access.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-semibold">Pending vendor applications</h2>
                </div>
                {pendingVendors.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                      <p className="font-medium">No vendor applications waiting</p>
                    </CardContent>
                  </Card>
                ) : (
                  pendingVendors.map((vendor) => (
                    <Card key={vendor.id}>
                      <CardContent className="p-4 flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{vendor.name || "Unnamed applicant"}</span>
                            <Badge variant="secondary">{vendor.vendorStatus}</Badge>
                            {vendor.vendorFeePaid && <Badge className="bg-emerald-600 text-white">Fee paid</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {vendor.email}
                          </div>
                          {vendor.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {vendor.phone}
                            </div>
                          )}
                          {vendor.vendorRequestedAt && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Requested {new Date(vendor.vendorRequestedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setSelectedVendorRequest(vendor)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold">Pending properties</h2>
                </div>
                {pendingProperties.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                      <p className="font-medium">No pending properties to review</p>
                    </CardContent>
                  </Card>
                ) : (
                  pendingProperties.map((property) => (
                    <Card key={property.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">{property.title}</div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {property.city}, {property.state}
                            </div>
                            <div className="text-lg font-bold text-primary">
                              ${property.totalPrice.toLocaleString()}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => setSelectedProperty(property)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="properties" className="space-y-4 mt-0">
              {loadingProperties ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">Loading recent properties…</CardContent></Card>
              ) : allProperties.length === 0 ? (
                <Card><CardContent className="p-8 text-center"><Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-lg font-medium">No properties found</p></CardContent></Card>
              ) : (
                allProperties.map((property) => (
                  <Card key={property.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{property.title}</span>
                            {property.isVerified ? (
                              <Badge className="bg-green-500 text-white text-xs">Verified</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Pending</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{property.status}</Badge>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {property.city}, {property.state}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-bold text-primary">${property.totalPrice.toLocaleString()}</span>
                            <span className="text-muted-foreground">{property.areaSqm.toLocaleString()} m²</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedProperty(property)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteProperty(property.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-4 mt-0">
              {loadingUsers ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">Loading users…</CardContent></Card>
              ) : users.length === 0 ? (
                <Card><CardContent className="p-8 text-center"><Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-lg font-medium">No users found</p></CardContent></Card>
              ) : (
                users.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.name || "No Name"}</span>
                            {(user.role === "PREMIUM_USER" || user.role === "PREMIUM_VENDOR") && (
                              <Badge className="bg-amber-500 text-white">
                                <Crown className="h-3 w-3 mr-1" />
                                Premium
                              </Badge>
                            )}
                            <Badge variant="outline">{user.role}</Badge>
                            {user.vendorStatus !== "NONE" && <Badge variant="secondary">Vendor: {user.vendorStatus}</Badge>}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>{user._count?.properties ?? 0} properties</span>
                            <span>{user._count?.bids ?? 0} bids</span>
                            <span>{user.propertiesViewed} views</span>
                          </div>
                          {user.premiumExpiry && (
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                              <Calendar className="h-3 w-3" />
                              Premium until: {new Date(user.premiumExpiry).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setSelectedUser(user)}>
                          <Crown className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="bids" className="space-y-4 mt-0">
              <Card>
                <CardContent className="p-8 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">Bid Management</p>
                  <p className="text-muted-foreground">
                    Bid analytics can stay behind a separate endpoint later. This panel now focuses on approval queues.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Property</DialogTitle>
            <DialogDescription>Verify or reject this property listing.</DialogDescription>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-4">
              <div>
                <Label>Property Title</Label>
                <div className="font-medium">{selectedProperty.title}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <div>{selectedProperty.type}</div>
                </div>
                <div>
                  <Label>Area</Label>
                  <div>{selectedProperty.areaSqm} m²</div>
                </div>
              </div>

              <div>
                <Label>Price</Label>
                <div className="text-2xl font-bold text-primary">${selectedProperty.totalPrice.toLocaleString()}</div>
              </div>

              <div>
                <Label>Location</Label>
                <div>{selectedProperty.address}</div>
                <div>{selectedProperty.city}, {selectedProperty.state}</div>
              </div>

              {selectedProperty.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground">{selectedProperty.description}</p>
                </div>
              )}

              <Separator />

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => handleVerifyProperty(selectedProperty.id, true)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verify
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => handleVerifyProperty(selectedProperty.id, false)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>

              <div className="pt-2 border-t">
                <Button variant="ghost" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteProperty(selectedProperty.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Property Permanently
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedVendorRequest} onOpenChange={() => setSelectedVendorRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review vendor request</DialogTitle>
            <DialogDescription>The admin has the final say before vendor access is granted.</DialogDescription>
          </DialogHeader>

          {selectedVendorRequest && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                <div className="font-medium">{selectedVendorRequest.name || "Unnamed applicant"}</div>
                <div className="text-sm text-muted-foreground">{selectedVendorRequest.email}</div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{selectedVendorRequest.role}</Badge>
                  <Badge variant="secondary">{selectedVendorRequest.vendorStatus}</Badge>
                  {selectedVendorRequest.vendorFeePaid && <Badge className="bg-emerald-600 text-white">$30 fee confirmed</Badge>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Phone</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {selectedVendorRequest.phone || "Not provided"}
                  </div>
                </div>
                <div>
                  <Label>ID Number</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <FileBadge className="h-4 w-4 text-muted-foreground" />
                    {selectedVendorRequest.vendorIdNumber || "Not provided"}
                  </div>
                </div>
              </div>

              <div>
                <Label>Address</Label>
                <div className="text-sm text-muted-foreground">{selectedVendorRequest.vendorAddress || "Not provided"}</div>
              </div>

              {selectedVendorRequest.vendorRequestedAt && (
                <div>
                  <Label>Submitted</Label>
                  <div className="text-sm text-muted-foreground">{new Date(selectedVendorRequest.vendorRequestedAt).toLocaleString()}</div>
                </div>
              )}

              <Separator />

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => handleVendorDecision(selectedVendorRequest.id, "APPROVED")}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve vendor access
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => handleVendorDecision(selectedVendorRequest.id, "REJECTED")}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Manage User
            </DialogTitle>
            <DialogDescription>Update user role and premium status.</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="font-medium">{selectedUser.name || "No Name"}</div>
                <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline">{selectedUser.role}</Badge>
                  <Badge variant="secondary">Vendor: {selectedUser.vendorStatus}</Badge>
                  {selectedUser.subscriptionPlan === "PREMIUM" && (
                    <Badge className="bg-amber-500 text-white">Premium</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Premium Duration (days)</Label>
                  <Select value={premiumDuration} onValueChange={setPremiumDuration}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => handleUpgradeUser(selectedUser.id, "PREMIUM_USER", parseInt(premiumDuration, 10))}>
                    <Crown className="h-4 w-4 mr-2" />
                    Premium User
                  </Button>
                  <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleUpgradeUser(selectedUser.id, "PREMIUM_VENDOR", parseInt(premiumDuration, 10))}>
                    <Crown className="h-4 w-4 mr-2" />
                    Premium Vendor
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => handleUpgradeUser(selectedUser.id, "USER", 0)}>
                    Regular User
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => handleUpgradeUser(selectedUser.id, "VENDOR", 0)}>
                    Vendor
                  </Button>
                </div>
              </div>

              <Separator />

              <Button variant="ghost" className="w-full" onClick={() => setSelectedUser(null)}>
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
