import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Settings2, Wifi, User, Ruler, Globe, Palette, Upload, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { useWorkshopBrand } from "@/lib/workshop-brand";

const settingsSchema = z.object({
  language: z.string(),
  units: z.enum(["metric", "imperial"]),
  brightness: z.coerce.number().min(0).max(100),
  volume: z.coerce.number().min(0).max(100),
  autoSleep: z.coerce.number(),
  wifiEnabled: z.boolean(),
  bluetoothEnabled: z.boolean(),
  shopName: z.string().optional(),
  technicianName: z.string().optional(),
});

const LANGUAGES = [
  { value: "ar", label: "العربية", flag: "🇸🇦" },
  { value: "en-US", label: "English (US)", flag: "🇺🇸" },
  { value: "es-ES", label: "Español", flag: "🇪🇸" },
  { value: "fr-FR", label: "Français", flag: "🇫🇷" },
  { value: "de-DE", label: "Deutsch", flag: "🇩🇪" },
];

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, lang, setLang } = useI18n();
  const { brand, updateBrand } = useWorkshopBrand();
  const [brandSaved, setBrandSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [brandForm, setBrandForm] = useState({
    shopName: brand.shopName,
    tagline: brand.tagline,
    phone: brand.phone,
    email: brand.email,
    address: brand.address,
    website: brand.website,
    primaryColor: brand.primaryColor,
    accentColor: brand.accentColor,
    technicianName: brand.technicianName,
    licenseNumber: brand.licenseNumber,
    logoDataUrl: brand.logoDataUrl,
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setBrandForm(prev => ({ ...prev, logoDataUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const saveBranding = () => {
    updateBrand(brandForm);
    setBrandSaved(true);
    setTimeout(() => setBrandSaved(false), 2000);
    toast({ title: lang === "ar" ? "تم حفظ هوية الورشة بنجاح" : "Workshop branding saved" });
  };

  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: ["/api/device/settings"] }
  });

  const updateSettings = useUpdateSettings();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      language: lang === "ar" ? "ar" : "en-US",
      units: "metric",
      brightness: 100,
      volume: 80,
      autoSleep: 30,
      wifiEnabled: true,
      bluetoothEnabled: true,
      shopName: "",
      technicianName: ""
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        language: lang === "ar" ? "ar" : (settings.language || "en-US"),
        units: settings.units,
        brightness: settings.brightness,
        volume: settings.volume,
        autoSleep: settings.autoSleep,
        wifiEnabled: settings.wifiEnabled ?? true,
        bluetoothEnabled: settings.bluetoothEnabled ?? true,
        shopName: settings.shopName || "",
        technicianName: settings.technicianName || ""
      });
    }
  }, [settings, lang]);

  const handleLanguageChange = (value: string) => {
    form.setValue("language", value);
    if (value === "ar") {
      setLang("ar");
    } else {
      setLang("en");
    }
  };

  const onSubmit = (data: z.infer<typeof settingsSchema>) => {
    updateSettings.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: lang === "ar" ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully" });
      },
      onError: () => toast({ title: lang === "ar" ? "فشل حفظ الإعدادات" : "Failed to save settings", variant: "destructive" })
    });
  };

  if (isLoading) return <div className="p-8">{t("loading")}</div>;

  const currentLang = form.watch("language");

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("navSettings")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {lang === "ar" ? "ضبط تفضيلات الجهاز" : "Configure device preferences"}
          </p>
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={updateSettings.isPending} size="lg" data-testid="button-save-settings">
          <Save className="w-4 h-4 mr-2" />
          {updateSettings.isPending
            ? (lang === "ar" ? "جارٍ الحفظ..." : "Saving...")
            : (lang === "ar" ? "حفظ التغييرات" : "Save Changes")
          }
        </Button>
      </div>

      <Form {...form}>
        <form className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Language Card — Featured at top */}
            <Card className="md:col-span-2 bg-primary/5 border-primary/20 shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-primary" />
                  {lang === "ar" ? "اللغة" : "Language"}
                </CardTitle>
                <CardDescription>
                  {lang === "ar" ? "اختر لغة واجهة الجهاز" : "Select the device interface language"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => handleLanguageChange(l.value)}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-medium text-sm ${
                        currentLang === l.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      <span className="text-2xl">{l.flag}</span>
                      <span>{l.label}</span>
                      {currentLang === l.value && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                          {lang === "ar" ? "✓ محدد" : "✓ Active"}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Workshop Info */}
            <Card className="bg-card/50 backdrop-blur-sm border-border shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-primary" />
                  {lang === "ar" ? "معلومات الورشة" : "Workshop Information"}
                </CardTitle>
                <CardDescription>
                  {lang === "ar" ? "تظهر في التقارير المُنشأة" : "Appears on generated reports"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="shopName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{lang === "ar" ? "اسم الورشة" : "Shop Name"}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="technicianName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{lang === "ar" ? "الفني المسؤول" : "Lead Technician"}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Workshop Branding */}
            <Card className="md:col-span-2 bg-gradient-to-br from-violet-500/5 to-blue-500/5 border-violet-500/20 shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Palette className="w-5 h-5 text-violet-400" />
                      {lang === "ar" ? "هوية الورشة في التقارير" : "Workshop Report Branding"}
                    </CardTitle>
                    <CardDescription>
                      {lang === "ar" ? "لوجو وألوان وبيانات الاتصال تظهر في تقارير PDF" : "Logo, colors and contact info embedded in PDF reports"}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    onClick={saveBranding}
                    variant={brandSaved ? "default" : "outline"}
                    size="sm"
                    className={brandSaved ? "bg-green-600 hover:bg-green-600" : "border-violet-500/40 text-violet-400 hover:bg-violet-500/10"}
                  >
                    {brandSaved ? (
                      <><CheckCircle2 className="w-4 h-4 mr-1" /> {lang === "ar" ? "تم الحفظ!" : "Saved!"}</>
                    ) : (
                      <><Save className="w-4 h-4 mr-1" /> {lang === "ar" ? "حفظ الهوية" : "Save Branding"}</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Logo upload */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">{lang === "ar" ? "شعار الورشة" : "Workshop Logo"}</p>
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="aspect-video rounded-xl border-2 border-dashed border-border hover:border-violet-500/50 bg-background/50 flex flex-col items-center justify-center cursor-pointer transition-colors group"
                    >
                      {brandForm.logoDataUrl ? (
                        <img src={brandForm.logoDataUrl} alt="Logo" className="max-h-full max-w-full object-contain p-2 rounded-lg" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-muted-foreground group-hover:text-violet-400 transition-colors mb-2" />
                          <span className="text-xs text-muted-foreground">{lang === "ar" ? "انقر لرفع الشعار" : "Click to upload logo"}</span>
                          <span className="text-[10px] text-muted-foreground/60 mt-1">PNG, JPG, SVG</span>
                        </>
                      )}
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    {brandForm.logoDataUrl && (
                      <button
                        type="button"
                        onClick={() => setBrandForm(prev => ({ ...prev, logoDataUrl: "" }))}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        {lang === "ar" ? "× إزالة الشعار" : "× Remove logo"}
                      </button>
                    )}
                  </div>

                  {/* Contact info */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">{lang === "ar" ? "بيانات الاتصال" : "Contact Details"}</p>
                    {[
                      { key: "shopName", label: lang === "ar" ? "اسم الورشة" : "Shop Name", placeholder: "My Auto Workshop" },
                      { key: "tagline", label: lang === "ar" ? "الشعار الوصفي" : "Tagline", placeholder: "Professional Automotive Service" },
                      { key: "phone", label: lang === "ar" ? "رقم الهاتف" : "Phone", placeholder: "+966 5X XXX XXXX" },
                      { key: "email", label: lang === "ar" ? "البريد الإلكتروني" : "Email", placeholder: "info@workshop.com" },
                      { key: "website", label: lang === "ar" ? "الموقع الإلكتروني" : "Website", placeholder: "www.workshop.com" },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                        <Input
                          value={(brandForm as any)[key] || ""}
                          placeholder={placeholder}
                          onChange={(e) => setBrandForm(prev => ({ ...prev, [key]: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Colors + extra */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">{lang === "ar" ? "ألوان التقرير" : "Report Colors"}</p>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "اللون الرئيسي (Header)" : "Primary Color (Header)"}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandForm.primaryColor}
                          onChange={(e) => setBrandForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-10 h-8 rounded cursor-pointer border border-border bg-transparent"
                        />
                        <Input
                          value={brandForm.primaryColor}
                          onChange={(e) => setBrandForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "لون التمييز (Accent)" : "Accent Color"}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandForm.accentColor}
                          onChange={(e) => setBrandForm(prev => ({ ...prev, accentColor: e.target.value }))}
                          className="w-10 h-8 rounded cursor-pointer border border-border bg-transparent"
                        />
                        <Input
                          value={brandForm.accentColor}
                          onChange={(e) => setBrandForm(prev => ({ ...prev, accentColor: e.target.value }))}
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div className="pt-2 space-y-3">
                      <p className="text-sm font-medium text-foreground">{lang === "ar" ? "معلومات الفني" : "Technician Info"}</p>
                      {[
                        { key: "technicianName", label: lang === "ar" ? "اسم الفني" : "Technician Name", placeholder: "Ahmad Al-Mahmoud" },
                        { key: "address", label: lang === "ar" ? "العنوان" : "Address", placeholder: "Riyadh, Saudi Arabia" },
                        { key: "licenseNumber", label: lang === "ar" ? "رقم الترخيص" : "License Number", placeholder: "SA-12345" },
                      ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                          <Input
                            value={(brandForm as any)[key] || ""}
                            placeholder={placeholder}
                            onChange={(e) => setBrandForm(prev => ({ ...prev, [key]: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Preview strip */}
                    <div className="mt-4 rounded-lg overflow-hidden border border-border/50">
                      <div
                        className="h-8 flex items-center justify-between px-3"
                        style={{ backgroundColor: brandForm.primaryColor }}
                      >
                        <span className="text-white text-[10px] font-bold truncate">
                          {brandForm.shopName || "Workshop Name"}
                        </span>
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded"
                          style={{ backgroundColor: brandForm.accentColor, color: "#fff" }}
                        >
                          REPORT
                        </span>
                      </div>
                      <div className="bg-white h-4 flex items-center px-3">
                        <div className="h-1 rounded-full flex-1" style={{ backgroundColor: brandForm.accentColor, opacity: 0.4 }} />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{lang === "ar" ? "معاينة رأس التقرير" : "Report header preview"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Regional */}
            <Card className="bg-card/50 backdrop-blur-sm border-border shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Ruler className="w-5 h-5 text-primary" />
                  {lang === "ar" ? "الإعدادات الإقليمية" : "Regional Settings"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="units" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{lang === "ar" ? "وحدات القياس" : "Measurement Units"}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="metric">{lang === "ar" ? "متري (كم/س، °م، كيلو باسكال)" : "Metric (km/h, °C, kPa)"}</SelectItem>
                        <SelectItem value="imperial">{lang === "ar" ? "إمبراطوري (ميل/س، °ف، psi)" : "Imperial (mph, °F, psi)"}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Connectivity */}
            <Card className="bg-card/50 backdrop-blur-sm border-border shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wifi className="w-5 h-5 text-primary" />
                  {lang === "ar" ? "الاتصال" : "Connectivity"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField control={form.control} name="wifiEnabled" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Wi-Fi</FormLabel>
                      <FormDescription>{lang === "ar" ? "تفعيل الشبكة اللاسلكية" : "Enable wireless networking"}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="bluetoothEnabled" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Bluetooth / VCI</FormLabel>
                      <FormDescription>{lang === "ar" ? "مطلوب للتواصل اللاسلكي مع VCI" : "Required for wireless VCI communication"}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Device Preferences */}
            <Card className="bg-card/50 backdrop-blur-sm border-border shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings2 className="w-5 h-5 text-primary" />
                  {lang === "ar" ? "تفضيلات الجهاز" : "Device Preferences"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="autoSleep" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{lang === "ar" ? "مؤقت السكون التلقائي" : "Auto-Sleep Timer"}</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="5">{lang === "ar" ? "5 دقائق" : "5 Minutes"}</SelectItem>
                        <SelectItem value="15">{lang === "ar" ? "15 دقيقة" : "15 Minutes"}</SelectItem>
                        <SelectItem value="30">{lang === "ar" ? "30 دقيقة" : "30 Minutes"}</SelectItem>
                        <SelectItem value="60">{lang === "ar" ? "ساعة واحدة" : "1 Hour"}</SelectItem>
                        <SelectItem value="0">{lang === "ar" ? "بدون سكون" : "Never Sleep"}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

          </div>
        </form>
      </Form>
    </div>
  );
}
