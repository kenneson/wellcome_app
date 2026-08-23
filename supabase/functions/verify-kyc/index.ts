import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import {
  RekognitionClient,
  CompareFacesCommand,
  DetectFacesCommand,
} from "https://esm.sh/@aws-sdk/client-rekognition@3.750.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Thresholds
const REVIEW_THRESHOLD = 80;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user's JWT (for auth)
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Get request body
    const { documentPath, selfiePath } = await req.json();
    if (!documentPath || !selfiePath) {
      return new Response(
        JSON.stringify({ error: "documentPath and selfiePath are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const escapedUserId = user.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const documentMatch = documentPath.match(
      new RegExp(`^${escapedUserId}/([0-9a-f-]{36})/document\\.jpg$`, "i")
    );
    const selfieMatch = selfiePath.match(
      new RegExp(`^${escapedUserId}/([0-9a-f-]{36})/selfie\\.jpg$`, "i")
    );
    if (!documentMatch || !selfieMatch || documentMatch[1] !== selfieMatch[1]) {
      return new Response(
        JSON.stringify({ error: "Invalid KYC document paths" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: currentProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("kyc_status")
      .eq("id", user.id)
      .single();
    if (profileError) {
      return new Response(
        JSON.stringify({ error: "Failed to load KYC status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (currentProfile.kyc_status === "APPROVED" || currentProfile.kyc_status === "PENDING") {
      return new Response(
        JSON.stringify({
          error: currentProfile.kyc_status === "APPROVED"
            ? "Identity already verified"
            : "KYC submission already under review",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Download images from Supabase Storage
    const [docResult, selfieResult] = await Promise.all([
      supabaseAdmin.storage.from("kyc-documents").download(documentPath),
      supabaseAdmin.storage.from("kyc-documents").download(selfiePath),
    ]);

    if (docResult.error || selfieResult.error) {
      return new Response(
        JSON.stringify({
          error: "Failed to download images",
          details: docResult.error?.message || selfieResult.error?.message,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const docBytes = new Uint8Array(await docResult.data.arrayBuffer());
    const selfieBytes = new Uint8Array(await selfieResult.data.arrayBuffer());

    // 4. Initialize Rekognition client
    const rekognition = new RekognitionClient({
      region: Deno.env.get("AWS_REGION") || "us-east-1",
      credentials: {
        accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
      },
    });

    // 5. DetectFaces on selfie — verify it's a real face with good quality
    const detectCommand = new DetectFacesCommand({
      Image: { Bytes: selfieBytes },
      Attributes: ["ALL"],
    });

    const detectResult = await rekognition.send(detectCommand);
    const faces = detectResult.FaceDetails || [];

    if (faces.length === 0) {
      // No face detected in selfie
      await supabaseAdmin
        .from("profiles")
        .update({
          kyc_status: "REJECTED",
          kyc_rejection_reason: "Nenhum rosto detectado na selfie. Tente novamente com melhor iluminação.",
          kyc_submitted_at: new Date().toISOString(),
          kyc_reviewed_at: new Date().toISOString(),
          kyc_document_url: documentPath,
          kyc_selfie_url: selfiePath,
        })
        .eq("id", user.id);

      return new Response(
        JSON.stringify({
          status: "REJECTED",
          reason: "Nenhum rosto detectado na selfie",
          canRetry: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if eyes are open (basic liveness)
    const mainFace = faces[0];
    const eyesOpen = mainFace.EyesOpen?.Value ?? true;
    const faceConfidence = mainFace.Confidence ?? 0;

    if (faceConfidence < 90) {
      await supabaseAdmin
        .from("profiles")
        .update({
          kyc_status: "REJECTED",
          kyc_rejection_reason: "Qualidade da selfie muito baixa. Tente novamente com melhor iluminação.",
          kyc_submitted_at: new Date().toISOString(),
          kyc_reviewed_at: new Date().toISOString(),
          kyc_document_url: documentPath,
          kyc_selfie_url: selfiePath,
        })
        .eq("id", user.id);

      return new Response(
        JSON.stringify({
          status: "REJECTED",
          reason: "Qualidade da selfie insuficiente",
          canRetry: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. CompareFaces — compare document photo with selfie
    const compareCommand = new CompareFacesCommand({
      SourceImage: { Bytes: docBytes },
      TargetImage: { Bytes: selfieBytes },
      SimilarityThreshold: 70, // Low threshold to get results even for low matches
    });

    let similarityScore = 0;
    let compareError = null;

    try {
      const compareResult = await rekognition.send(compareCommand);
      const matches = compareResult.FaceMatches || [];
      if (matches.length > 0) {
        similarityScore = matches[0].Similarity ?? 0;
      }
    } catch (err: any) {
      // If no face found in source (document), handle gracefully
      if (err.name === "InvalidParameterException") {
        compareError = "Não foi possível detectar um rosto no documento. Certifique-se de que a foto do RG/CNH está clara.";
      } else {
        throw err;
      }
    }

    // 7. Determine KYC status based on score
    let kycStatus: string;
    let rejectionReason: string | null = null;

    if (compareError) {
      kycStatus = "REJECTED";
      rejectionReason = compareError;
    } else if (similarityScore >= REVIEW_THRESHOLD) {
      // Face matching is a triage signal, not a complete identity decision.
      // A human reviewer must validate the immutable document submission.
      kycStatus = "PENDING";
    } else {
      kycStatus = "REJECTED";
      rejectionReason = `Similaridade insuficiente (${similarityScore.toFixed(1)}%). O rosto no documento não corresponde à selfie.`;
    }

    // 8. Update profile
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        kyc_status: kycStatus,
        kyc_similarity_score: similarityScore,
        kyc_document_url: documentPath,
        kyc_selfie_url: selfiePath,
        kyc_submitted_at: new Date().toISOString(),
        kyc_reviewed_at: kycStatus !== "PENDING" ? new Date().toISOString() : null,
        kyc_rejection_reason: rejectionReason,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: kycStatus,
        similarityScore: Math.round(similarityScore),
        reason: rejectionReason,
        canRetry: kycStatus === "REJECTED",
        eyesOpen,
        faceConfidence: Math.round(faceConfidence),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("KYC verification error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
