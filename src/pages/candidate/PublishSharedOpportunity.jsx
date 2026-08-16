@@
-const EMPTY_FORM = {
-  title: '',
-  location: '',
-  description: '',
-  contactMethod: '',
-};
+const EMPTY_FORM = {
+  title: '',
+  location: '',
+  description: '',
+  requirements: '',
+  contactWhatsApp: '',
+  contactPhone: '',
+  contactEmail: '',
+};
@@
-  const [form, setForm] = useState(EMPTY_FORM);
+  const [form, setForm] = useState(EMPTY_FORM);
@@
-  const validate = () => {
+  const validate = () => {
     if (!form.title.trim()) return 'El título del empleo es obligatorio.';
     if (form.title.trim().length > TITLE_MAX) {
       return `El título no puede superar ${TITLE_MAX} caracteres.`;
     }
     if (!form.description.trim()) return 'La descripción es obligatoria.';
     if (form.description.trim().length > DESCRIPTION_MAX) {
       return `La descripción no puede superar ${DESCRIPTION_MAX} caracteres.`;
     }
-    if (form.contactMethod.trim().length > CONTACT_MAX) {
-      return `El método de contacto no puede superar ${CONTACT_MAX} caracteres.`;
-    }
+    // Validate contact fields: at least one must be present
+    const hasContact = [form.contactWhatsApp, form.contactPhone, form.contactEmail]
+      .some((v) => String(v ?? '').trim().length > 0);
+    if (!hasContact) return 'Añade al menos una forma de contacto para que las personas interesadas puedan comunicarse contigo.';
+    if (String(form.contactWhatsApp ?? '').trim().length > CONTACT_MAX) return `El WhatsApp no puede superar ${CONTACT_MAX} caracteres.`;
+    if (String(form.contactPhone ?? '').trim().length > CONTACT_MAX) return `El teléfono no puede superar ${CONTACT_MAX} caracteres.`;
+    if (String(form.contactEmail ?? '').trim().length > CONTACT_MAX) return `El email no puede superar ${CONTACT_MAX} caracteres.`;
     return '';
   };
@@
-    const { data, error: saveError } = await jobsService.createSharedOpportunity({
-      userId: user.id,
-      title: form.title,
-      description: form.description,
-      city: form.location,
-      contactMethod: form.contactMethod,
-      imageFile,
-    });
+    // Compose contact_method string reusing existing DB column format
+    const contactLines = [];
+    if (String(form.contactWhatsApp ?? '').trim()) contactLines.push(`WhatsApp: ${String(form.contactWhatsApp).trim()}`);
+    if (String(form.contactPhone ?? '').trim()) contactLines.push(`Teléfono: ${String(form.contactPhone).trim()}`);
+    if (String(form.contactEmail ?? '').trim()) contactLines.push(`Email: ${String(form.contactEmail).trim()}`);
+    const contactMethod = contactLines.join('\n') || null;
+
+    const { data, error: saveError } = await jobsService.createSharedOpportunity({
+      userId: user.id,
+      title: form.title,
+      description: form.description,
+      city: form.location,
+      contactMethod,
+      requirements: form.requirements,
+      imageFile,
+    });
@@
-          <Textarea
-            label="Descripción"
-            value={form.description}
-            onChange={(e) => setField('description', e.target.value)}
-            placeholder="Describe la oportunidad, requisitos básicos y cualquier detalle útil."
-            rows={6}
-            maxLength={DESCRIPTION_MAX}
-            required
-          />
-          <Input
-            label="Método de contacto"
-            value={form.contactMethod}
-            onChange={(e) => setField('contactMethod', e.target.value)}
-            placeholder="Ej. WhatsApp, email o mensaje en TrabaGE (opcional)"
-            maxLength={CONTACT_MAX}
-          />
+          <Textarea
+            label="Descripción"
+            value={form.description}
+            onChange={(e) => setField('description', e.target.value)}
+            placeholder="Describe la oportunidad, requisitos básicos y cualquier detalle útil."
+            rows={6}
+            maxLength={DESCRIPTION_MAX}
+            required
+          />
+          <Textarea
+            label="Requisitos (opcional)"
+            value={form.requirements}
+            onChange={(e) => setField('requirements', e.target.value)}
+            placeholder="Indica los requisitos, experiencia o condiciones que consideres importantes..."
+            rows={4}
+            maxLength={DESCRIPTION_MAX}
+          />
+
+          <div className="space-y-2">
+            <p className="text-sm font-medium text-gray-900">Forma de contacto</p>
+            <Input
+              label="WhatsApp"
+              value={form.contactWhatsApp}
+              onChange={(e) => setField('contactWhatsApp', e.target.value)}
+              placeholder="Ej. +240 123 456 789"
+              maxLength={CONTACT_MAX}
+            />
+            <Input
+              label="Teléfono"
+              value={form.contactPhone}
+              onChange={(e) => setField('contactPhone', e.target.value)}
+              placeholder="Ej. +240 123 456 789"
+              maxLength={CONTACT_MAX}
+            />
+            <Input
+              label="Email"
+              value={form.contactEmail}
+              onChange={(e) => setField('contactEmail', e.target.value)}
+              placeholder="Ej. ejemplo@correo.com"
+              maxLength={CONTACT_MAX}
+            />
+          </div>
@@
-        </Card>
+        </Card>
       </form>
     </FormPageLayout>
   );
 }
