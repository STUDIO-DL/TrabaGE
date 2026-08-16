@@
   createSharedOpportunity: async ({ userId, title, description, city, contactMethod, imageFile }) => {
-    const basePayload = enrichJobMatchingFields({
+    const basePayload = enrichJobMatchingFields({
       source_type: JOB_SOURCE.USER,
       shared_by_user_id: userId,
       company_id: null,
       title: String(title ?? '').trim(),
       description: String(description ?? '').trim() || null,
       city: String(city ?? '').trim() || null,
-      contact_method: String(contactMethod ?? '').trim() || null,
+      contact_method: String(contactMethod ?? '').trim() || null,
+      // requirements for shared opportunities (optional)
+      requirements: (typeof arguments[0].requirements !== 'undefined' && String(arguments[0].requirements).trim())
+        ? String(arguments[0].requirements).trim()
+        : null,
       status: 'active',
       salary_negotiable: true,
     });
@@